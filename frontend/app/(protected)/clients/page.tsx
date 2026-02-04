import { ManageClients } from "@/features/clients/components/ManageClients";
import ContentContainer from "@/components/layout/ContentContainer";

export default async function ClientPage() {
  return (
    <ContentContainer>
      <ManageClients />
    </ContentContainer>
  );
}
