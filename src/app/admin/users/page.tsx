import Link from "next/link";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  await requireAdmin();

  const employees = await prisma.user.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to orders
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Employees
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Employee accounts and access roles.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[500px] text-left text-sm">
            <caption className="sr-only">
              Employees and their access roles
            </caption>

            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">
                  Name
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Email
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Role
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 font-medium">
                    {employee.name}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {employee.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium capitalize text-indigo-700">
                      {employee.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
