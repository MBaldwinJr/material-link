/**
 * Material Link — Modelo B: contratos de domínio propostos para a rede.
 *
 * Apenas tipos e documentação: NÃO implementa autorização, migração ou
 * operações remotas. Regras de acesso são obrigatoriamente verificadas no banco.
 * Os tipos em src/types/domain.ts seguem compatíveis com o módulo legado.
 */

export type OrganizationId = string;
export type MemberUserId = string;

export type OrganizationStatus = "onboarding" | "verified" | "suspended" | "blocked";

export interface NetworkOrganization {
  readonly id: OrganizationId;
  readonly legalName: string;
  readonly displayName: string;
  readonly cnpj: string;
  readonly status: OrganizationStatus;
  readonly verifiedAt: string | null;
}

export type OrganizationRole =
  | "owner"
  | "administrator"
  | "commercial"
  | "stock"
  | "finance"
  | "read_only";

export type OrganizationMembershipStatus =
  | "invited"
  | "active"
  | "suspended"
  | "revoked";

export interface OrganizationMembership {
  readonly organizationId: OrganizationId;
  readonly userId: MemberUserId;
  readonly role: OrganizationRole;
  readonly status: OrganizationMembershipStatus;
  readonly approvedByUserId: MemberUserId | null;
}

export type PartnershipStatus =
  | "pending"
  | "active"
  | "declined"
  | "blocked"
  | "terminated";

export interface NetworkPartnership {
  readonly id: string;
  readonly requesterOrganizationId: OrganizationId;
  readonly invitedOrganizationId: OrganizationId;
  readonly status: PartnershipStatus;
  readonly acceptedByUserId: MemberUserId | null;
  readonly createdAt: string;
}

export interface OrganizationProduct {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly sku: string;
  readonly description: string;
  readonly unit: string;
  /** PRIVATE: this cost must never appear in bilateral loan projections. */
  readonly privateCostCents: number;
  readonly privateRetailPriceCents: number;
}

export interface OrganizationStockBalance {
  readonly organizationId: OrganizationId;
  readonly productId: string;
  readonly storageLocationId: string;
  readonly availableQuantity: number;
  readonly reservedQuantity: number;
  readonly outboundInTransitQuantity: number;
  /** Material in custody is not own saleable inventory. */
  readonly inboundThirdPartyCustodyQuantity: number;
}

export type PublishedAvailability = "inquire" | "limited" | "available";

export interface NetworkPublishedOffer {
  readonly id: string;
  readonly ownerOrganizationId: OrganizationId;
  readonly productId: string;
  readonly publicDescription: string;
  readonly unit: string;
  readonly availability: PublishedAvailability;
  readonly sharing: "approved_partners" | "specified_partner";
  readonly targetOrganizationId: OrganizationId | null;
  // No stock balance, location, private cost or margin in this contract.
}

export type LoanProposalStatus =
  | "requested"
  | "counteroffered"
  | "accepted_by_lender"
  | "accepted_by_borrower"
  | "mutually_accepted"
  | "declined"
  | "expired"
  | "cancelled";

export interface NetworkLoanProposal {
  readonly id: string;
  readonly lenderOrganizationId: OrganizationId;
  readonly borrowerOrganizationId: OrganizationId;
  readonly status: LoanProposalStatus;
  readonly version: number;
  readonly requestedByOrganizationId: OrganizationId;
  readonly proposedDueAt: string;
  readonly expiresAt: string;
}

export interface NetworkLoanLine {
  readonly id: string;
  readonly loanId: string;
  readonly lenderProductId: string;
  readonly descriptionSnapshot: string;
  readonly unitSnapshot: string;
  readonly agreedUnitValueCents: number;
  readonly quantity: number;
  readonly confirmedReturnedQuantity: number;
}

export type NetworkLoanPhysicalState =
  | "reserved"
  | "awaiting_dispatch"
  | "dispatched"
  | "in_custody"
  | "return_in_transit"
  | "partially_returned"
  | "physically_settled"
  | "cancelled";

export type NetworkLoanExceptionState =
  | "none"
  | "disputed"
  | "damage_reported"
  | "loss_reported"
  | "compensation_pending"
  | "resolved";

export interface NetworkLoanAgreement {
  readonly id: string;
  readonly publicNumber: string;
  readonly lenderOrganizationId: OrganizationId;
  readonly borrowerOrganizationId: OrganizationId;
  readonly proposalId: string;
  readonly version: number;
  readonly dueAt: string;
  readonly agreedAt: string;
  readonly physicalState: NetworkLoanPhysicalState;
  readonly exceptionState: NetworkLoanExceptionState;
  readonly lines: readonly NetworkLoanLine[];
}

export type ShipmentDirection = "lender_to_borrower" | "borrower_to_lender";

export interface NetworkShipment {
  readonly id: string;
  readonly loanId: string;
  readonly direction: ShipmentDirection;
  readonly sentByOrganizationId: OrganizationId;
  readonly receivedByOrganizationId: OrganizationId;
  readonly dispatchedAt: string | null;
  readonly confirmedReceivedAt: string | null;
  readonly proofFileId: string | null;
}

export type NetworkReturnCondition =
  | "intact"
  | "damaged"
  | "lost"
  | "replacement_proposed";

export interface NetworkReturnLine {
  readonly id: string;
  readonly shipmentId: string;
  readonly loanLineId: string;
  readonly dispatchedQuantity: number;
  readonly confirmedIntactQuantity: number;
  readonly condition: NetworkReturnCondition;
}

export interface NetworkBusinessEvent {
  readonly id: string;
  readonly loanId: string;
  readonly actorOrganizationId: OrganizationId;
  readonly actorUserId: MemberUserId;
  readonly kind: string;
  readonly idempotencyKey: string;
  readonly operationVersion: number;
  readonly occurredAt: string;
  /** Only fields both participating organizations are allowed to inspect. */
  readonly sharedPayload: Readonly<Record<string, string | number | boolean | null>>;
}

/**
 * Transition requests are untrusted inputs: every server operation must
 * verify auth.uid(), membership, capability, partnership, loan ownership,
 * expectedVersion, idempotency, valid state transitions and physical stock.
 */
export interface BilateralCommandContext {
  readonly actingOrganizationId: OrganizationId;
  readonly expectedVersion: number;
  readonly idempotencyKey: string;
}

export interface RequestLoanCommand extends BilateralCommandContext {
  readonly lenderOrganizationId: OrganizationId;
  readonly borrowerOrganizationId: OrganizationId;
  readonly lines: readonly {
    readonly lenderProductId: string;
    readonly quantity: number;
  }[];
  readonly proposedDueAt: string;
}

export interface ConfirmShipmentCommand extends BilateralCommandContext {
  readonly loanId: string;
  readonly shipmentId: string;
}

export interface ConfirmReturnCommand extends BilateralCommandContext {
  readonly loanId: string;
  readonly shipmentId: string;
  readonly acceptedLines: readonly {
    readonly loanLineId: string;
    readonly intactQuantity: number;
  }[];
}
