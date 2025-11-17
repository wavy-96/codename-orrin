"use client";

export function Footer() {
  return (
    <footer className="bg-warm-sand border-t border-ethics-black/10 py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-center items-center text-sm text-ethics-black/60">
          <p>
            © {new Date().getFullYear()} Interview Prep. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

