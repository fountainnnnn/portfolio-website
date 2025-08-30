export default function WorkPage() {
  const items = [
    { title: "Project A", blurb: "3D product reveal", href: "#" },
    { title: "Project B", blurb: "Realtime data viz", href: "#" },
    { title: "Project C", blurb: "Generative shaders", href: "#" },
  ];
  return (
    <main style={{maxWidth:1120,margin:"0 auto",padding:"96px 16px"}}>
      <h1 style={{marginBottom:24}}>Selected Work</h1>
      <div style={{display:"grid",gap:16,gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))"}}>
        {items.map(p=>(
          <a key={p.title} href={p.href} style={{border:"1px solid #ffffff22",borderRadius:12,padding:16,textDecoration:"none",color:"inherit"}}>
            <h3 style={{margin:"0 0 6px"}}>{p.title}</h3>
            <p style={{opacity:.8,margin:0}}>{p.blurb}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
