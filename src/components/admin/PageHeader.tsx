// src/components/admin/PageHeader.tsx
// Consistent page header for all admin pages
// Shows page title, subtitle, and optional actions
interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  children?: React.ReactNode; // action buttons
}

export default function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="font-bold text-gray-900 text-lg">{title}</h1>
        {subtitle && <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
