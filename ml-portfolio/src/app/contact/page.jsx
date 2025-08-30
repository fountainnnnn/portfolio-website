export default function ContactPage() {
  return (
    <main style={{maxWidth:560,margin:"0 auto",padding:"96px 16px"}}>
      <h1>Get in touch</h1>
      <div style={{marginTop:16,display:"grid",gap:12}}>
        <a href="mailto:you@example.com">you@example.com</a>
        <div style={{display:"flex",gap:16}}>
          <a href="https://github.com/yourhandle">GitHub</a>
          <a href="https://www.linkedin.com/in/yourhandle/">LinkedIn</a>
          <a href="https://x.com/yourhandle">X/Twitter</a>
        </div>
      </div>
    </main>
  );
}
