import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const column = await prisma.column.findUnique({ where: { id } });
  if (!column) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (column.authorId !== userId) {
    return NextResponse.json({ error: "Only the author can delete this column" }, { status: 403 });
  }

  await prisma.column.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
