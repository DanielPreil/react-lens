import ClientWidget from "../client-widget";

async function submitAction() {
  "use server";
}

export default function Page() {
  return <ClientWidget userId="1" submitAction={submitAction} />;
}
