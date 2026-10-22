import { ReportViewer } from '@/components/ui/ReportViewer'

export default function Page() {
    return (
        <div>
            <div className="sv-page-head">
                <h1 className="sv-h1">Identity guardian</h1>
                <p className="sv-lede">You confirm a verified student filed the report, without seeing the content. The report content is closed to you.</p>
            </div>
            <ReportViewer mode="guardian" />
        </div>
    )
}
