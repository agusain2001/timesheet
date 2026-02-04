import { ManageDivisions } from "@/features/divisions/components/ManageDivisions";
import ContentContainer from "@/components/layout/ContentContainer";

export default async function ClientPage() {
  return (
    <ContentContainer>
      <ManageDivisions />
    </ContentContainer>
  );
}
