"use client";

/** A submit button that asks first (window.confirm); the form is sent only on OK. For admin actions that move money or hide things. */
export function ConfirmSubmit({ message, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
