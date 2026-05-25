import { useNavigate } from "react-router-dom";
import { Construction } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

export default function ComingSoon() {
  const navigate = useNavigate();
  return (
    <PageLayout showBack title="Coming soon">
      <EmptyState
        icon={<Construction size={36} aria-hidden />}
        title="We're still building this"
        description="This part of Cozie is on the roadmap. Check back soon."
        action={
          <Button onClick={() => navigate("/home-feed")}>Go to home</Button>
        }
      />
    </PageLayout>
  );
}
