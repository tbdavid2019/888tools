## MODIFIED Requirements

### Requirement: OpenCC-JS Converter Engine
The system SHALL use the `opencc-js` library as the underlying translation engine for Chinese character conversion, replacing the legacy inline TongWen dictionaries.

#### Scenario: Translate Simplified to Traditional Chinese
- **WHEN** the user inputs "软件和硬件" with direction Simplified to Traditional (s2t)
- **THEN** the system MUST translate it to "軟體和硬體" using `opencc-js` (with phrase conversion config twp)

#### Scenario: Translate Traditional to Simplified Chinese
- **WHEN** the user inputs "電腦和伺服器" with direction Traditional to Simplified (t2s)
- **THEN** the system MUST translate it to "电脑和服务器" using `opencc-js`
