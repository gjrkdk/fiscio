/**
 * Belastingtips engine — berekent proactieve tips op basis van gebruikersdata.
 * Alle bedragen zijn op basis van belastingjaar 2024/2025.
 */

// ─── Constanten 2024/2025 ──────────────────────────────────────────────────
export const BELASTING_PARAMS = {
  // Inkomstenbelasting Box 1
  ib_tarief_laag: 0.3697,            // tot €75.518
  ib_tarief_hoog: 0.4950,            // boven €75.518

  // Aftrekposten
  zelfstandigenaftrek: 3750,         // 2024 (daalt naar €900 in 2027)
  startersaftrek: 2123,
  mkb_winstvrijstelling: 0.127,      // 12,7% van winst na aftrekken

  // Urencriterium
  uren_drempel: 1225,

  // KOR
  kor_drempel: 20000,                // BTW-vrijstelling bij omzet < €20K

  // KIA (Kleinschaligheidsinvesteringsaftrek)
  kia_min: 2800,
  kia_max: 353973,
  kia_percentage: 0.28,

  // Lijfrente / pensioen
  aow_franchise: 13646,              // AOW-franchise 2024
  lijfrente_percentage: 0.30,        // 30% van inkomen boven franchise

  // BV-drempel
  bv_drempel: 90000,

  // VPB tarief BV
  vpb_laag: 0.19,                    // t/m €200.000

  // DGA salaris minimum
  dga_min_salaris: 56000,
}

// ─── Types ─────────────────────────────────────────────────────────────────
export type TipStatus = 'kans' | 'aandacht' | 'op_koers' | 'nvt'

export type BelastingTip = {
  id: string
  status: TipStatus
  titel: string
  uitleg: string
  impact: number | null      // € besparing
  actie: string
  urgentie: 'hoog' | 'middel' | 'laag'
  categorie: string
}

export type TipsData = {
  omzetJaar: number
  kostenJaar: number
  winstJaar: number
  investeerdbedragJaar: number
  urenGeregistreerd: number
  dagenVerstreken: number
  dagenInJaar: number
  tips: BelastingTip[]
  totaalPotentieel: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function belastingBesparing(aftrekBedrag: number, winst: number): number {
  const p = BELASTING_PARAMS
  const belastbaarNaMKB = Math.max(0, winst - aftrekBedrag) * (1 - p.mkb_winstvrijstelling)
  const belastbaarVoor   = Math.max(0, winst) * (1 - p.mkb_winstvrijstelling)
  const tarief = winst > 75518 ? p.ib_tarief_hoog : p.ib_tarief_laag
  return Math.round((belastbaarVoor - belastbaarNaMKB) * tarief)
}

function dagVanHetJaar(): { verstreken: number; totaal: number } {
  const nu = new Date()
  const beginJaar = new Date(nu.getFullYear(), 0, 1)
  const eindJaar  = new Date(nu.getFullYear() + 1, 0, 1)
  const verstreken = Math.floor((nu.getTime() - beginJaar.getTime()) / 86400000)
  const totaal     = Math.floor((eindJaar.getTime() - beginJaar.getTime()) / 86400000)
  return { verstreken, totaal }
}

// ─── Tip-berekeningen ──────────────────────────────────────────────────────

function tipKOR(omzetJaar: number): BelastingTip {
  const p = BELASTING_PARAMS
  const onder = omzetJaar < p.kor_drempel
  const bijna = omzetJaar >= p.kor_drempel * 0.9 && omzetJaar < p.kor_drempel

  if (bijna) {
    return {
      id: 'kor',
      status: 'aandacht',
      titel: 'KOR — let op: omzetgrens in zicht',
      uitleg: `Je omzet is €${Math.round(omzetJaar).toLocaleString('nl-NL')} en nadert de KOR-grens van €20.000. ` +
              `Als je boven €20K komt, moet je BTW gaan afdragen. Plan je omzet zorgvuldig.`,
      impact: null,
      actie: 'Controleer verwachte omzet voor het rest van het jaar',
      urgentie: 'hoog',
      categorie: 'BTW',
    }
  }

  if (onder) {
    const btw = Math.round(omzetJaar * 0.21 * 0.3) // schatting terugontvangen BTW
    return {
      id: 'kor',
      status: 'kans',
      titel: 'KOR — mogelijk BTW-vrijstelling',
      uitleg: `Je omzet is €${Math.round(omzetJaar).toLocaleString('nl-NL')} — onder de KOR-grens van €20.000. ` +
              `Met de Kleineondernemersregeling hoef je geen BTW meer te berekenen en af te dragen. ` +
              `Voordeel: minder administratie, klanten betalen een lagere prijs.`,
      impact: btw,
      actie: 'Meld je aan voor KOR via Mijn Belastingdienst Zakelijk',
      urgentie: 'middel',
      categorie: 'BTW',
    }
  }

  return {
    id: 'kor',
    status: 'nvt',
    titel: 'KOR — niet van toepassing',
    uitleg: `Je omzet van €${Math.round(omzetJaar).toLocaleString('nl-NL')} is boven de KOR-grens van €20.000.`,
    impact: null,
    actie: '',
    urgentie: 'laag',
    categorie: 'BTW',
  }
}

function tipKIA(investeerdbedrag: number, winst: number): BelastingTip {
  const p = BELASTING_PARAMS
  const kwalif = investeerdbedrag >= p.kia_min && investeerdbedrag <= p.kia_max
  const bijnaMin = investeerdbedrag > 0 && investeerdbedrag < p.kia_min

  if (bijnaMin) {
    const tekort = p.kia_min - investeerdbedrag
    return {
      id: 'kia',
      status: 'kans',
      titel: `KIA — nog €${Math.round(tekort).toLocaleString('nl-NL')} van drempel`,
      uitleg: `Je hebt €${Math.round(investeerdbedrag).toLocaleString('nl-NL')} geïnvesteerd in bedrijfsmiddelen. ` +
              `Investeer nog €${Math.round(tekort).toLocaleString('nl-NL')} meer en je krijgt 28% extra aftrek over het totaal.`,
      impact: Math.round(p.kia_min * p.kia_percentage * (winst > 75518 ? p.ib_tarief_hoog : p.ib_tarief_laag)),
      actie: `Overweeg zakelijke aankopen (laptop, apparatuur) om boven €${p.kia_min.toLocaleString('nl-NL')} te komen`,
      urgentie: 'middel',
      categorie: 'Investeringsaftrek',
    }
  }

  if (kwalif) {
    const aftrek = Math.round(investeerdbedrag * p.kia_percentage)
    const besparing = belastingBesparing(aftrek, winst)
    return {
      id: 'kia',
      status: 'op_koers',
      titel: 'KIA — investeringsaftrek van toepassing',
      uitleg: `Je hebt €${Math.round(investeerdbedrag).toLocaleString('nl-NL')} geïnvesteerd in bedrijfsmiddelen. ` +
              `Je ontvangt 28% KIA-aftrek = €${aftrek.toLocaleString('nl-NL')} extra aftrek op je belastingaangifte.`,
      impact: besparing,
      actie: 'Zorg dat alle zakelijke investeringen in je boekhouding staan',
      urgentie: 'laag',
      categorie: 'Investeringsaftrek',
    }
  }

  return {
    id: 'kia',
    status: 'nvt',
    titel: 'KIA — geen kwalificerende investeringen',
    uitleg: `Je hebt dit jaar geen zakelijke investeringen geregistreerd boven de €${p.kia_min.toLocaleString('nl-NL')} drempel voor KIA.`,
    impact: null,
    actie: 'Registreer zakelijke aankopen van bedrijfsmiddelen als ze boven €2.800 komen',
    urgentie: 'laag',
    categorie: 'Investeringsaftrek',
  }
}

function tipUrencriterium(uren: number): BelastingTip {
  const p = BELASTING_PARAMS
  const { verstreken, totaal } = dagVanHetJaar()
  const verwachtEindJaar = totaal > 0 ? Math.round(uren * totaal / verstreken) : uren
  const haalt = verwachtEindJaar >= p.uren_drempel
  const tekort = Math.max(0, p.uren_drempel - uren)
  const restDagen = totaal - verstreken
  const urenPerDag = restDagen > 0 ? (tekort / restDagen).toFixed(1) : '0'
  const besparing = belastingBesparing(p.zelfstandigenaftrek, 60000) // schatting

  if (uren === 0) {
    return {
      id: 'urencriterium',
      status: 'aandacht',
      titel: 'Urencriterium — uren nog niet geregistreerd',
      uitleg: `Voor de zelfstandigenaftrek (€${p.zelfstandigenaftrek.toLocaleString('nl-NL')}) moet je minimaal ` +
              `${p.uren_drempel} uur per jaar aan je onderneming besteden. Houd je uren bij om dit te kunnen aantonen.`,
      impact: besparing,
      actie: 'Registreer je gewerkte uren via de urenteller hieronder',
      urgentie: 'hoog',
      categorie: 'Zelfstandigenaftrek',
    }
  }

  if (!haalt) {
    return {
      id: 'urencriterium',
      status: 'aandacht',
      titel: `Urencriterium — ${uren} / ${p.uren_drempel} uur`,
      uitleg: `Je hebt ${uren} uur geregistreerd. Je moet voor 31 december nog ${tekort} uur werken ` +
              `(≈ ${urenPerDag} uur/dag de komende ${restDagen} dagen) om de zelfstandigenaftrek te halen.`,
      impact: besparing,
      actie: 'Werk meer uren of pas je urenregistratie aan',
      urgentie: tekort > 200 ? 'hoog' : 'middel',
      categorie: 'Zelfstandigenaftrek',
    }
  }

  return {
    id: 'urencriterium',
    status: 'op_koers',
    titel: `Urencriterium — ${uren} uur ✓`,
    uitleg: `Je hebt ${uren} uur geregistreerd en haalt naar verwachting de ${p.uren_drempel} uur drempel. ` +
            `Zelfstandigenaftrek van €${p.zelfstandigenaftrek.toLocaleString('nl-NL')} is van toepassing.`,
    impact: besparing,
    actie: 'Blijf uren bijhouden als bewijs voor de Belastingdienst',
    urgentie: 'laag',
    categorie: 'Zelfstandigenaftrek',
  }
}

function tipLijfrente(winst: number): BelastingTip {
  const p = BELASTING_PARAMS
  if (winst <= 0) {
    return {
      id: 'lijfrente',
      status: 'nvt',
      titel: 'Lijfrente — geen winst dit jaar',
      uitleg: 'Lijfrente-aftrek is gebaseerd op winst. Zodra je winst maakt, kun je hier belasting besparen.',
      impact: null, actie: '', urgentie: 'laag', categorie: 'Pensioen',
    }
  }

  const jaarruimte = Math.max(0, Math.round((winst - p.aow_franchise) * p.lijfrente_percentage))
  const besparing = belastingBesparing(jaarruimte, winst)

  return {
    id: 'lijfrente',
    status: 'kans',
    titel: `Lijfrente — €${jaarruimte.toLocaleString('nl-NL')} aftrekruimte`,
    uitleg: `Als ZZP'er bouw je geen pensioen op via een werkgever. De Belastingdienst geeft je jaarruimte ` +
            `om dit te compenseren: je mag €${jaarruimte.toLocaleString('nl-NL')} belastingvrij in een lijfrente of bankspaarproduct storten. ` +
            `Dit verlaagt je belastbaar inkomen direct.`,
    impact: besparing,
    actie: 'Open een lijfrenterekening bij bijv. Brand New Day, DEGIRO of je eigen bank',
    urgentie: 'middel',
    categorie: 'Pensioen',
  }
}

function tipBVDrempel(winst: number): BelastingTip | null {
  const p = BELASTING_PARAMS
  if (winst < p.bv_drempel) return null

  const ibNu = Math.round(winst * (1 - p.mkb_winstvrijstelling) * p.ib_tarief_laag)
  const ibNaMKB = Math.round(Math.max(0, winst - p.zelfstandigenaftrek) * (1 - p.mkb_winstvrijstelling))
  const bvVpb  = Math.round((winst - p.dga_min_salaris) * p.vpb_laag)
  const ibDGA  = Math.round(p.dga_min_salaris * (1 - p.mkb_winstvrijstelling) * p.ib_tarief_laag)
  const voordeel = Math.max(0, ibNu - bvVpb - ibDGA)

  return {
    id: 'bv',
    status: 'kans',
    titel: `BV overwegen bij €${Math.round(winst).toLocaleString('nl-NL')} winst`,
    uitleg: `Bij winst boven ~€90.000 kan een BV belastingvoordeel opleveren. Je betaalt dan 19% ` +
            `vennootschapsbelasting i.p.v. ~37% inkomstenbelasting over het winstdeel boven je DGA-salaris. ` +
            `Oprichting kost ~€1.000-€2.000 en hogere accountantskosten.`,
    impact: voordeel,
    actie: 'Bespreek BV-omzetting met een belastingadviseur',
    urgentie: 'middel',
    categorie: 'Ondernemingsvorm',
  }
}

// ─── Hoofd-export ─────────────────────────────────────────────────────────
export function berekenTips(input: {
  omzetJaar: number
  kostenJaar: number
  investeerdbedragJaar: number
  urenGeregistreerd: number
}): TipsData {
  const { omzetJaar, kostenJaar, investeerdbedragJaar, urenGeregistreerd } = input
  const winstJaar = Math.max(0, omzetJaar - kostenJaar)
  const { verstreken, totaal } = dagVanHetJaar()

  const tips: BelastingTip[] = []
  tips.push(tipKOR(omzetJaar))
  tips.push(tipKIA(investeerdbedragJaar, winstJaar))
  tips.push(tipUrencriterium(urenGeregistreerd))
  tips.push(tipLijfrente(winstJaar))

  const bvTip = tipBVDrempel(winstJaar)
  if (bvTip) tips.push(bvTip)

  // Filter nvt tips met lage urgentie eruit voor de samenvatting
  const relevanteTips = tips.filter(t => t.status !== 'nvt' || t.urgentie !== 'laag')
  const totaalPotentieel = tips
    .filter(t => t.impact !== null && (t.status === 'kans' || t.status === 'op_koers'))
    .reduce((s, t) => s + (t.impact ?? 0), 0)

  return {
    omzetJaar,
    kostenJaar,
    winstJaar,
    investeerdbedragJaar,
    urenGeregistreerd,
    dagenVerstreken: verstreken,
    dagenInJaar: totaal,
    tips: relevanteTips,
    totaalPotentieel,
  }
}
