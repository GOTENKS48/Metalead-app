
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { io } from "socket.io-client";

const socket = io("https://pouch-rimmed-rehire.ngrok-free.dev", {
  transports: ["websocket"],
  autoConnect: false,
});

type Lead = {
  id: string;
  createdTime?: string | number;
  receivedTime: string;
  pageId?: string;
  formId?: string;
  adId?: string;
  adgroupId?: string;
  webhookTime?: number;
};

function extractLead(data: any): Lead[] {
  const leads: Lead[] = [];

  
  let payload = data;

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      console.error("Invalid webhook JSON");
      return leads;
    }
  }

  payload = payload?.data ?? payload;

  const receivedTime = new Date().toISOString();

  for (const entry of payload?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;

      const value = change.value ?? {};
      if (!value.leadgen_id) continue;

      leads.push({
        id: String(value.leadgen_id),
        createdTime: value.created_time,
        receivedTime,
        pageId: value.page_id,
        formId: value.form_id,
        adId: value.ad_id,
        adgroupId: value.adgroup_id,
        webhookTime: entry.time,
      });
    }
  }

  return leads;
}

function formatTime(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "Not provided";
  }


  const date =
    typeof value === "number" ||
    (typeof value === "string" && /^\d+$/.test(value))
      ? new Date(Number(value) * 1000)
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function Detail({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.value}>
        {String(value)}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const handleConnect = () => {
      console.log("Frontend connected:", socket.id);
    };

    const handleConnectError = (error: Error) => {
      console.error("Socket connection error:", error.message);
    };

    const handleNotification = (data: any) => {
      console.log(
        "Webhook event received:",
        JSON.stringify(data, null, 2)
      );

      const extractedLeads = extractLead(data);

      console.log(
        "Extracted leads:",
        JSON.stringify(extractedLeads, null, 2)
      );

      if (extractedLeads.length === 0) {
        console.log("No leadgen event found in payload");
        return;
      }

      setLeads((previous) => [
        ...extractedLeads.reverse(),
        ...previous,
      ]);
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("pushNotification", handleNotification);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("pushNotification", handleNotification);
      socket.disconnect();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Meta Lead Alert App</Text>
      </View>

      <FlatList
        data={leads}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            Received Leads ({leads.length})
          </Text>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No leads received yet.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Facebook Lead</Text>

            <Detail label="Lead ID" value={item.id} />

            <Detail
              label="Created Time"
              value={formatTime(item.createdTime)}
            />

            <Detail
              label="Webhook Event Time"
              value={
                item.webhookTime !== undefined
                  ? formatTime(item.webhookTime)
                  : undefined
              }
            />

            <Detail
              label="Received Time"
              value={formatTime(item.receivedTime)}
            />

            <Detail label="Page ID" value={item.pageId} />
            <Detail label="Form ID" value={item.formId} />
            <Detail label="Ad ID" value={item.adId} />
            <Detail label="Ad Group ID" value={item.adgroupId} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },
  header: {
    backgroundColor: "#0866FF",
    paddingHorizontal: 16,
    paddingVertical: 22,
    paddingTop: 28,
    alignItems: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  sectionTitle: {
    color: "#1C1E21",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 14,
  },
  empty: {
    color: "#606770",
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#0866FF",
  },
  cardTitle: {
    color: "#0866FF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  detail: {
    marginTop: 10,
  },
  label: {
    color: "#606770",
    fontSize: 12,
    marginBottom: 3,
  },
  value: {
    color: "#1C1E21",
    fontSize: 14,
    fontWeight: "500",
  },
});
