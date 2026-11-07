import ToolsBrowser from "../../components/ToolsBrowser";
import { getTools } from "../../lib/data";

export const metadata = { title: "Tools" };

export default function Tools() {
  const { stages, tools, workflows } = getTools();
  return (
    <>
      <header className="page-head">
        <div className="container">
          <p className="eyebrow">Tools</p>
          <h1 className="h1">Tools we use and build</h1>
          <p className="lede" style={{ marginTop: 20, marginBottom: 0 }}>
            The map follows a project from structure to screening, chemistry, assays and structure determination.
            Step through a workflow, or search the cards below and filter them by tag.
          </p>
        </div>
      </header>
      <ToolsBrowser stages={stages} tools={tools} workflows={workflows} />
    </>
  );
}
