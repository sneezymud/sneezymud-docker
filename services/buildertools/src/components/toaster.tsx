import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: "#18181b",
          border: "1px solid #3f3f46",
          color: "#e4e4e7",
        },
      }}
    />
  );
}
