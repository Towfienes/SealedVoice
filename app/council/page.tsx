import { ReportViewer } from '@/components/ui/ReportViewer'

export default function Page() {
    return (
        <div>
            <div className="sv-page-head">
                <h1 className="sv-h1">University Council</h1>
                <p className="sv-lede">Every report has a copy for the Council with a time lock. Before the lock expires, opening it is refused. After, it opens. Nobody can cancel or extend it.</p>
            </div>
            <ReportViewer mode="council" />
        </div>
    )
}
