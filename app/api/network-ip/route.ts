import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIp = "localhost";

  // Procura o IP local da interface Wi-Fi ou Ethernet ativa (192.168.x.x ou 10.x.x.x)
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;

    // Ignora interfaces virtuais como VMware, VirtualBox, vEthernet
    const lowerName = name.toLowerCase();
    if (lowerName.includes("vmnet") || lowerName.includes("virtual") || lowerName.includes("vbox")) {
      continue;
    }

    for (const iface of ifaceList) {
      if (iface.family === "IPv4" && !iface.internal) {
        // Prioriza a rede local padrão 192.168 ou 10.
        if (iface.address.startsWith("192.168.") || iface.address.startsWith("10.")) {
          localIp = iface.address;
          break;
        }
      }
    }
    if (localIp !== "localhost") break;
  }

  return NextResponse.json({
    ip: localIp,
    port: 3000,
    controlUrl: `http://${localIp}:3000/controle`,
    tvUrl: `http://${localIp}:3000/tv`,
  });
}
