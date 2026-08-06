export function WorkspaceNotFound({ subdomain }: { subdomain: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-md w-full text-center space-y-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workspace not found</h1>
        <p className="text-gray-600 dark:text-gray-400">
          We couldn't find a workspace at <span className="font-mono">{subdomain}</span>.
          Double check the link, or contact your organization for the correct address.
        </p>
      </div>
    </div>
  );
}
