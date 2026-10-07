import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-control group-[.toast]:text-control-foreground group-[.toast]:border group-[.toast]:border-control-border",
          cancelButton: "group-[.toast]:bg-control group-[.toast]:text-control-foreground group-[.toast]:border group-[.toast]:border-control-border",
        },
      }}
      style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      {...props}
    />
  );
};

export { Toaster, toast };
