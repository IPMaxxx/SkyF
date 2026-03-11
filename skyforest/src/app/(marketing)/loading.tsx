export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
        <p className="text-sm text-white/40">Загрузка...</p>
      </div>
    </div>
  );
}
