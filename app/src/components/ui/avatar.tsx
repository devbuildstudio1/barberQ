import Image from "next/image";
import { cn, initials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
};
const px = { sm: 32, md: 40, lg: 56, xl: 80 };

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-800 select-none",
        sizes[size],
        className,
      )}
      aria-hidden={!name}
    >
      {src ? (
        <Image src={src} alt={name ?? ""} width={px[size]} height={px[size]} className="size-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  );
}
