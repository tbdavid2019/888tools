import { tool as base64FileConverter } from './base64-file-converter';
import { tool as base64StringConverter } from './base64-string-converter';
import { tool as basicAuthGenerator } from './basic-auth-generator';
import { tool as barcodeGenerator } from './barcode-generator';
import { tool as emailNormalizer } from './email-normalizer';

import { tool as asciiTextDrawer } from './ascii-text-drawer';

import { tool as textToUnicode } from './text-to-unicode';
import { tool as tongWenConverter } from './tongwen-converter';
import { tool as safelinkDecoder } from './safelink-decoder';
import { tool as xmlToJson } from './xml-to-json';
import { tool as jsonToXml } from './json-to-xml';
import { tool as regexTester } from './regex-tester';
import { tool as regexMemo } from './regex-memo';
import { tool as markdownToHtml } from './markdown-to-html';
import { tool as pdfSignatureChecker } from './pdf-signature-checker';
import { tool as numeronymGenerator } from './numeronym-generator';
import { tool as macAddressGenerator } from './mac-address-generator';
import { tool as textToBinary } from './text-to-binary';
import { tool as ulidGenerator } from './ulid-generator';
import { tool as ibanValidatorAndParser } from './iban-validator-and-parser';
import { tool as stringObfuscator } from './string-obfuscator';
import { tool as textDiff } from './text-diff';
import { tool as emojiPicker } from './emoji-picker';
import { tool as passwordStrengthAnalyser } from './password-strength-analyser';
import { tool as yamlToToml } from './yaml-to-toml';
import { tool as jsonToToml } from './json-to-toml';
import { tool as tomlToYaml } from './toml-to-yaml';
import { tool as tomlToJson } from './toml-to-json';
import { tool as jsonToCsv } from './json-to-csv';
import { tool as cameraRecorder } from './camera-recorder';
import { tool as listConverter } from './list-converter';
import { tool as phoneParserAndFormatter } from './phone-parser-and-formatter';
import { tool as jsonDiff } from './json-diff';
import { tool as ipv4RangeExpander } from './ipv4-range-expander';
import { tool as httpStatusCodes } from './http-status-codes';
import { tool as yamlToJson } from './yaml-to-json-converter';
import { tool as jsonToYaml } from './json-to-yaml-converter';
import { tool as ipv6UlaGenerator } from './ipv6-ula-generator';
import { tool as ipv4AddressConverter } from './ipv4-address-converter';
import { tool as p2pFileTransfer } from './p2p-file-transfer';
import { tool as p2pChat } from './p2p-chat';
import { tool as benchmarkBuilder } from './benchmark-builder';
import { tool as userAgentParser } from './user-agent-parser';
import { tool as ipv4SubnetCalculator } from './ipv4-subnet-calculator';
import { tool as dockerRunToDockerComposeConverter } from './docker-run-to-docker-compose-converter';
import { tool as htmlWysiwygEditor } from './html-wysiwyg-editor';
import { tool as findColor } from './find-color';
import { tool as postWriter } from './post-writer';
import { tool as countdownTimer } from './countdown-timer';
import { tool as rsaKeyPairGenerator } from './rsa-key-pair-generator';
import { tool as textToNatoAlphabet } from './text-to-nato-alphabet';
import { tool as slugifyString } from './slugify-string';
import { tool as keycodeInfo } from './keycode-info';
import { tool as jsonMinify } from './json-minify';
import { tool as bcrypt } from './bcrypt';
import { tool as bip39 } from './bip39-generator';
import { tool as caseConverter } from './case-converter';
import { tool as chmodCalculator } from './chmod-calculator';
import { tool as chronometer } from './chronometer';
import { tool as colorConverter } from './color-converter';
import { tool as crontabGenerator } from './crontab-generator';
import { tool as dateTimeConverter } from './date-time-converter';
import { tool as deviceInformation } from './device-information';
import { tool as cypher } from './encryption';
import { tool as etaCalculator } from './eta-calculator';
import { tool as percentageCalculator } from './percentage-calculator';
import { tool as gitMemo } from './git-memo';
import { tool as hashText } from './hash-text';
import { tool as hmacGenerator } from './hmac-generator';
import { tool as htmlEntities } from './html-entities';
import { tool as baseConverter } from './integer-base-converter';
import { tool as jsonViewer } from './json-viewer';
import { tool as jwtParser } from './jwt-parser';
import { tool as loremIpsumGenerator } from './lorem-ipsum-generator';
import { tool as mathEvaluator } from './math-evaluator';
import { tool as metaTagGenerator } from './meta-tag-generator';
import { tool as mimeTypes } from './mime-types';
import { tool as otpCodeGeneratorAndValidator } from './otp-code-generator-and-validator';
import { tool as qrCodeGenerator } from './qr-code-generator';
import { tool as wifiQrCodeGenerator } from './wifi-qr-code-generator';
import { tool as qrChecker } from './qr-checker';
import { tool as randomPortGenerator } from './random-port-generator';
import { tool as romanNumeralConverter } from './roman-numeral-converter';
import { tool as sqlPrettify } from './sql-prettify';
import { tool as svgPlaceholderGenerator } from './svg-placeholder-generator';
import { tool as temperatureConverter } from './temperature-converter';
import { tool as textStatistics } from './text-statistics';
import { tool as tokenGenerator } from './token-generator';
import type { ToolCategory } from './tools.types';
import { tool as urlEncoder } from './url-encoder';
import { tool as urlParser } from './url-parser';
import { tool as uuidGenerator } from './uuid-generator';
import { tool as macAddressLookup } from './mac-address-lookup';
import { tool as xmlFormatter } from './xml-formatter';
import { tool as yamlViewer } from './yaml-viewer';
import { tool as fancyTextGenerator } from './fancy-text-generator';
import { tool as worldClock } from './world-clock';
import { tool as birthdayCalculator } from './birthday-calculator';
import { tool as dogAgeCalculator } from './dog-age-calculator';
import { tool as catAgeCalculator } from './cat-age-calculator';
import { tool as onlineClock } from './online-clock';
import { tool as removeBackground } from './remove-background';
import { tool as imageCompression } from './image-compression';
import { tool as pdfTools } from './pdf-tools';
import { tool as barcodeScanner } from './barcode-scanner';
import { tool as imageConverter } from './image-converter';
import { tool as videoConverter } from './video-converter';
import { tool as audioEditor } from './audio-editor';
import { tool as lyricPlayer } from './lyric-player';
import { tool as meetingCaptions } from './meeting-captions';
import { tool as micCameraTester } from './mic-camera-tester';
import { tool as colorCorrection } from './color-correction';
import { tool as svgTools } from './svg-tools';
import { tool as csvExcelViewer } from './csv-excel-viewer';
import { tool as txtToEpub } from './txt-to-epub';
import { tool as epubEditor } from './epub-editor';



export const toolsByCategory: ToolCategory[] = [
  {
    name: 'measurement',
    components: [chronometer, countdownTimer, worldClock, temperatureConverter, benchmarkBuilder, birthdayCalculator, dogAgeCalculator, catAgeCalculator, onlineClock],
  },
  {
    name: 'crypto',
    components: [tokenGenerator, hashText, bcrypt, uuidGenerator, ulidGenerator, cypher, bip39, hmacGenerator, rsaKeyPairGenerator, passwordStrengthAnalyser, pdfSignatureChecker],
  },
  {
    name: 'converter',
    components: [
      dateTimeConverter,
      baseConverter,
      romanNumeralConverter,
      base64StringConverter,
      base64FileConverter,
      colorConverter,
      caseConverter,
      yamlToJson,
      yamlToToml,
      jsonToYaml,
      jsonToToml,
      listConverter,
      tomlToJson,
      tomlToYaml,
      xmlToJson,
      jsonToXml,
    ],
  },
  {
    name: 'web',
    components: [
      urlEncoder,
      htmlEntities,
      urlParser,
      deviceInformation,
      basicAuthGenerator,
      metaTagGenerator,
      otpCodeGeneratorAndValidator,
      mimeTypes,
      jwtParser,
      keycodeInfo,
      slugifyString,
      userAgentParser,
      httpStatusCodes,
      jsonDiff,
      safelinkDecoder,
    ],
  },
  {
    name: 'images',
    components: [colorCorrection, svgTools, removeBackground, imageCompression, barcodeScanner, imageConverter, qrCodeGenerator, qrChecker, wifiQrCodeGenerator, svgPlaceholderGenerator, barcodeGenerator],
  },
  {
    name: 'videos',
    components: [micCameraTester, videoConverter, cameraRecorder],
  },
  {
    name: 'audio',
    components: [audioEditor, lyricPlayer, meetingCaptions],
  },
  {
    name: 'development',
    components: [
      gitMemo,
      randomPortGenerator,
      crontabGenerator,
      jsonViewer,
      jsonMinify,
      jsonToCsv,
      sqlPrettify,
      chmodCalculator,
      dockerRunToDockerComposeConverter,
      xmlFormatter,
      yamlViewer,
      emailNormalizer,
      regexTester,
      regexMemo,
    ],
  },
  {
    name: 'network',
    components: [ipv4SubnetCalculator, ipv4AddressConverter, ipv4RangeExpander, macAddressLookup, macAddressGenerator, ipv6UlaGenerator, p2pFileTransfer, p2pChat],
  },
  {
    name: 'math',
    components: [mathEvaluator, etaCalculator, percentageCalculator],
  },
  {
    name: 'editor',
    components: [htmlWysiwygEditor, findColor, postWriter, markdownToHtml, tongWenConverter],
  },
  {
    name: 'text',
    components: [
      loremIpsumGenerator,
      textStatistics,
      emojiPicker,
      stringObfuscator,
      textDiff,
      numeronymGenerator,
      asciiTextDrawer,
      textToNatoAlphabet,
      textToBinary,
      textToUnicode,
      fancyTextGenerator,
    ],
  },
  {
    name: 'data',
    components: [csvExcelViewer, phoneParserAndFormatter, ibanValidatorAndParser],
  },
  {
    name: 'pdf',
    components: [pdfTools],
  },
  {
    name: 'books',
    components: [txtToEpub, epubEditor],
  },
];

export const tools = toolsByCategory.flatMap(({ components }) => components);
export const toolsWithCategory = toolsByCategory.flatMap(({ components, name }) =>
  components.map(tool => ({ category: name, ...tool })),
);
