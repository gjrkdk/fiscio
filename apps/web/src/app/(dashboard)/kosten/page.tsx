export default function KostenPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Kosten & Bonnetjes</h2>
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + Bon toevoegen
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <div className="grid grid-cols-5 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Datum</span>
            <span>Leverancier</span>
            <span>Categorie</span>
            <span>BTW</span>
            <span>Bedrag</span>
          </div>
        </div>
        <div className="p-8 text-center text-gray-400 text-sm">
          Nog geen bonnetjes ingevoerd.
        </div>
      </div>
    </div>
  )
}
