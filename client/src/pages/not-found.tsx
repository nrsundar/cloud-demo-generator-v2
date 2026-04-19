import React from "react";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";

export default function NotFound() {
  return (
    <ContentLayout header={<Header variant="h1">404 — Page Not Found</Header>}>
      <Box variant="p" color="text-body-secondary">
        The page you requested does not exist. Use the navigation to return to a valid page.
      </Box>
    </ContentLayout>
  );
}
