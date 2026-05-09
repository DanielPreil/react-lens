import ClientWidget from "../client-widget";

export default function Page() {
  return <ClientWidget onSubmit={() => console.log("submit")} userId="1" />;
}
