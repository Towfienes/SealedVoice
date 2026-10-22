import { DeskGate } from '@/components/ui/DeskGate'
import { ReportViewer } from '@/components/ui/ReportViewer'

export default function Page() {
    return (
        <div>
            <div className="sv-page-head">
                <h1 className="sv-h1">University Council</h1>
                <p className="sv-lede">Every report has a copy for the Council with a time lock. Before the lock expires, opening it is refused. After, it opens. Nobody can cancel or extend it.</p>
            </div>
            <DeskGate need={{ kind: 'role', role: "council" }} desk="council desk" persona="University Council" personaId="council"
                hint="The Council holds the council role. Its copy opens only after the time lock.">
                <ReportViewer mode="council" />
            </DeskGate>
        </div>
    )
}
