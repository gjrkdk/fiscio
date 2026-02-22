export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">Omzet deze maand</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">€ —</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">Kilometers dit jaar</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">— km</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">Openstaande facturen</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">—</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Recente activiteit</h3>
        <p className="text-sm text-gray-400">Nog geen activiteit.</p>
      </div>
    </div>
  )
}
