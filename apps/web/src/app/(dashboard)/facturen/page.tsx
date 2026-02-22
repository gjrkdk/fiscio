export default function FacturenPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Facturen</h2>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + Factuur maken
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500">Concept</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">0</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500">Verzonden</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">0</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500">Betaald</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">0</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <div className="grid grid-cols-5 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Nummer</span>
            <span className="col-span-2">Klant</span>
            <span>Bedrag</span>
            <span>Status</span>
          </div>
        </div>
        <div className="p-8 text-center text-gray-400 text-sm">
          Nog geen facturen aangemaakt.
        </div>
      </div>
    </div>
  )
}
