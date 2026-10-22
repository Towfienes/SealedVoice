import { DeskGate } from '@/components/ui/DeskGate'
import { ReportViewer } from '@/components/ui/ReportViewer'

export default function Page() {
    return (
        <div>
            <div className="sv-page-head">
                <h1 className="sv-h1">Investigator desk</h1>
                <p className="sv-lede">You read what happened. You do not learn who reported it: the identity envelope is sealed against your role, and Tide says so itself.</p>
            </div>
            <DeskGate need={{ kind: 'role', role: "investigator" }} desk="investigator desk" persona="Inspector Lan" personaId="lan"
                hint="Inspector Lan holds the investigator role. She can read the report content, never the reporter identity.">
                <ReportViewer mode="investigator" />
            </DeskGate>
        </div>
    )
}
