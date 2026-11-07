import ToolsBrowser from "../../components/ToolsBrowser";
import { getTools } from "../../lib/data";

export const metadata = { title: "Tools" };

export default function Tools() {
  const { stages, tools, workflows } = getTools();
  const intro = (
    <div className="tl-intro">
      <p className="eyebrow">Tools</p>
      <h1 className="team-title">
        <span className="light">Tools we</span> <span>use and build</span>
      </h1>
      <p className="tl-lede">
        Step through a workflow on the map, or search the cards below and filter them by tag.
      </p>
    </div>
  );
  return <ToolsBrowser stages={stages} tools={tools} workflows={workflows} intro={intro} />;
}
