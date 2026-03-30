type GreetingHeaderProps = {
  title: string;
  subtitle: string;
};

export function GreetingHeader({ title, subtitle }: GreetingHeaderProps) {
  return (
    <header className="space-y-2 text-center sm:text-left">
      <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        {title}
      </h1>
      <p className="text-base leading-7 text-muted">{subtitle}</p>
    </header>
  );
}
