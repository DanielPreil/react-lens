export function Dangerous({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
