import type { WebMcpToolDefinition } from '../types';

export const chmodCalculatorTool: WebMcpToolDefinition = {
  name: 'calculate_chmod',
  description: 'Convert and calculate Linux/Unix chmod file permissions between Octal (e.g. 755, 644) and Symbolic (e.g. -rwxr-xr-x) formats.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      octal: {
        type: 'string',
        description: '3-digit octal permission string (e.g. "755", "644", "777")',
      },
      symbolic: {
        type: 'string',
        description: '9 or 10 character symbolic permission string (e.g. "rwxr-xr-x" or "-rw-r--r--")',
      },
    },
  },
  execute: ({ octal, symbolic }) => {
    const parseOctalDigit = (d: number) => ({
      read: (d & 4) !== 0,
      write: (d & 2) !== 0,
      execute: (d & 1) !== 0,
      symbolic: `${(d & 4) ? 'r' : '-'}${(d & 2) ? 'w' : '-'}${(d & 1) ? 'x' : '-'}`,
    });

    if (octal && typeof octal === 'string') {
      const match = octal.trim().match(/^[0-7]{3,4}$/);
      if (!match) {
        return { isError: true, error: 'Invalid octal notation. Must be 3 digits (0-7), e.g. 755' };
      }
      const raw = octal.trim().slice(-3);
      const [u, g, o] = raw.split('').map(Number);
      const userPerm = parseOctalDigit(u);
      const groupPerm = parseOctalDigit(g);
      const otherPerm = parseOctalDigit(o);

      const sym = `${userPerm.symbolic}${groupPerm.symbolic}${otherPerm.symbolic}`;
      return {
        octal: raw,
        symbolic: sym,
        command: `chmod ${raw} filename`,
        details: {
          user: userPerm,
          group: groupPerm,
          others: otherPerm,
        },
      };
    }

    if (symbolic && typeof symbolic === 'string') {
      let sym = symbolic.trim();
      if (sym.length === 10) {
        sym = sym.slice(1);
      }
      if (sym.length !== 9) {
        return { isError: true, error: 'Invalid symbolic notation. Must be 9 characters like rwxr-xr-x' };
      }

      const parseGroup = (str: string) => {
        let val = 0;
        if (str[0] === 'r') {
          val += 4;
        }
        if (str[1] === 'w') {
          val += 2;
        }
        if (str[2] === 'x') {
          val += 1;
        }
        return val;
      };

      const u = parseGroup(sym.slice(0, 3));
      const g = parseGroup(sym.slice(3, 6));
      const o = parseGroup(sym.slice(6, 9));
      const oct = `${u}${g}${o}`;

      return {
        octal: oct,
        symbolic: sym,
        command: `chmod ${oct} filename`,
        details: {
          user: parseOctalDigit(u),
          group: parseOctalDigit(g),
          others: parseOctalDigit(o),
        },
      };
    }

    return { isError: true, error: 'Please provide either octal (e.g. "755") or symbolic (e.g. "rwxr-xr-x") parameter.' };
  },
};
