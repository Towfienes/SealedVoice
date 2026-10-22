import { DeskGate } from '@/components/ui/DeskGate'
import { ReportViewer } from '@/components/ui/ReportViewer'

export default function Page() {
    return (
        <div>
            <div className="sv-page-head">
                <h1 className="sv-h1">Identity guardian</h1>
                <p className="sv-lede">You confirm a verified student filed the report, without seeing the content. The report content is closed to you.</p>
            </div>
            <DeskGate need={{ kind: 'role', role: "identity-guardian" }} desk="guardian desk" persona="Guardian Minh" personaId="minh"
                hint="Guardian Minh holds the identity-guardian role. He can confirm a verified student filed the report, never read its content.">
                <ReportViewer mode="guardian" />
            </DeskGate>
        </div>
    )
}
