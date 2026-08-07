import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control, FieldValues, Path } from "react-hook-form";

interface FormTextFieldProps<T extends FieldValues> {
  readonly control: Control<T>;
  readonly name: Path<T>;
  readonly label: string;
  readonly type?: string;
  readonly placeholder?: string;
}

export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  placeholder,
}: FormTextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface FormNumberFieldProps<T extends FieldValues> {
  readonly control: Control<T>;
  readonly name: Path<T>;
  readonly label: string;
  readonly step?: string;
  readonly placeholder?: string;
}

export function FormNumberField<T extends FieldValues>({
  control,
  name,
  label,
  step = "1",
  placeholder,
}: FormNumberFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              step={step} 
              placeholder={placeholder} 
              {...field} 
              value={field.value ?? ""} 
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface FormDateFieldProps<T extends FieldValues> {
  readonly control: Control<T>;
  readonly name: Path<T>;
  readonly label: string;
}

export function FormDateField<T extends FieldValues>({
  control,
  name,
  label,
}: FormDateFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="date" {...field} value={field.value ?? ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
