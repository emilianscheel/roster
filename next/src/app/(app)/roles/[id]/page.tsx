import { redirect } from "next/navigation";

export default async function RoleIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/roles/${id}/live`);
}
