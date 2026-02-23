import { NieuwFactuurForm } from './NieuwFactuurForm'

export default function NieuwFactuurPage() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Nieuwe factuur</h2>
      <p className="text-sm text-gray-500 mb-6">Vul de gegevens in en sla op als concept of verstuur direct.</p>
      <NieuwFactuurForm />
    </div>
  )
}
