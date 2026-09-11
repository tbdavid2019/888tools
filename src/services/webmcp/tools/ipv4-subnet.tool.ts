import { Netmask } from 'netmask';
import type { WebMcpToolDefinition } from '../types';
import { getIPClass } from '@/tools/ipv4-subnet-calculator/ipv4-subnet-calculator.models';

export const ipv4SubnetTool: WebMcpToolDefinition = {
  name: 'calculate_ipv4_subnet',
  description: 'Calculate IPv4 subnet properties including network address, netmask, broadcast, host range, CIDR notation, and network size.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      address: {
        type: 'string',
        description: 'IPv4 address with CIDR mask or netmask (e.g. "192.168.1.1/24" or "10.0.0.0 255.255.0.0")',
      },
    },
    required: ['address'],
  },
  execute: ({ address }) => {
    if (typeof address !== 'string' || !address.trim()) {
      return { isError: true, error: 'address must be a non-empty string' };
    }

    try {
      const block = new Netmask(address.trim());
      const ip = address.trim().split('/')[0]?.split(' ')[0] || block.base;
      const ipClass = getIPClass({ ip });

      return {
        success: true,
        networkAddress: block.base,
        netmask: block.mask,
        cidr: `/${block.bitmask}`,
        bitmask: block.bitmask,
        wildcardMask: block.hostmask,
        broadcastAddress: block.broadcast,
        firstHost: block.first,
        lastHost: block.last,
        totalHosts: block.size,
        usableHosts: Math.max(0, block.size - 2),
        ipClass: ipClass || 'Unknown',
      };
    }
    catch (err: any) {
      return {
        isError: true,
        error: `Invalid IPv4 subnet format: ${err?.message || String(err)}`,
      };
    }
  },
};
