import { ReportViewer } from '@/components/ui/ReportViewer'

export default function Page() {
    return (
        <div>
            <div className="sv-page-head">
                <h1 className="sv-h1">Investigator desk</h1>
                <p className="sv-lede">You read what happened. You do not learn who reported it: the identity envelope is sealed against your role, and Tide says so itself.</p>
            </div>
            <ReportViewer mode="investigator" />
        </div>
    )
}
