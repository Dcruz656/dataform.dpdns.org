export default function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
        active
          ? 'bg-secondary-container text-on-secondary-container'
          : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high hover:translate-x-1'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
