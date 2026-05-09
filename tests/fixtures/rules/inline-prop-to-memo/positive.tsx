import React from "react";

const Row = React.memo(function Row({ columns }: { columns: Array<{ key: string }> }) {
  return <div>{columns.length}</div>;
});

export function Parent() {
  return <Row columns={[{ key: "name" }]} />;
}
