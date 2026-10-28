import type { Metadata } from "next";
import { connection } from "next/server";
import { AddSubject, SubjectsMatrix } from "@/components/admin/subjects-manager";
import { PageTitle } from "@/components/admin/ui";
import { loadAdminData, requireAdmin } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  await connection();
  const session = await requireAdmin();
  const data = await loadAdminData(session);
  return (
    <>
      <PageTitle
        title="Subjects and tutors"
        sub="Who teaches what. A subject with no tutor shows as unavailable to students. Changes show on the site right away."
      />
      <div className="space-y-6">
        <SubjectsMatrix
          subjects={data.subjects.map((s) => ({ id: s.id, name: s.name, hasHonors: s.hasHonors, active: s.active }))}
          tutors={data.tutors.filter((t) => t.active).map((t) => ({ id: t.id, firstName: t.firstName, subjectIds: t.subjectIds }))}
        />
        <AddSubject />
      </div>
    </>
  );
}
