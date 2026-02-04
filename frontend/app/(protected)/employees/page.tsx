import ContentContainer from "@/components/layout/ContentContainer";
import { ManageEmployees } from "@/features/employees/components/ManageEmployees";

export default async function ClientPage() {
  return (
    <ContentContainer>
      <ManageEmployees />
    </ContentContainer>
  );
}
