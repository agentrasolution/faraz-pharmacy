interface ReportHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function ReportHeader({ title, description, children }: ReportHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}
