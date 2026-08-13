import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { designRules } from "@/db/schema";
import CreateDesignRuleForm from "./CreateDesignRuleForm";
import DesignRulesList from "./DesignRulesList";

export default async function DesignRulesPage() {
  const db = getDb();
  const rules = await db.query.designRules.findMany({ orderBy: desc(designRules.createdAt) });

  return (
    <>
      <h1>Design rules</h1>
      <p className="muted">
        Install/cabling constraints (min clearance, max cable run, preferred methods) fed to the LLM as
        context when it proposes a route for a survey session.
      </p>
      <CreateDesignRuleForm />
      <DesignRulesList initialRules={rules} />
    </>
  );
}
