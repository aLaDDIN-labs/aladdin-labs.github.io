import PdbViewer from "../../../components/PdbViewer";

export const metadata = { title: "PDB viewer · Tools" };

export default function Page() {
  return (
    <section className="pv-page">
      <div className="container">
        <p className="eyebrow">Tools</p>
        <h1 className="team-title"><span className="light">PDB</span> <span>viewer</span></h1>
        <p className="tl-lede">Load a structure by PDB ID or file, view a ligand with every residue that touches it, and export a figure at the size and resolution you set.</p>
        <PdbViewer />
      </div>
    </section>
  );
}
