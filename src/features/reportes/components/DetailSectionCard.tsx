import React from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '../../../theme';
import { CollapsibleHeader, Icon, Text } from '../../../ui';
import type { DetailSection, GridItem } from '../reportData';

/** Cuadrícula de 2 columnas: etiqueta 12 muted + valor 15/500. */
export function InfoGrid({ items, columns = 2, valueWeight = 'medium' }: { items: GridItem[]; columns?: number; valueWeight?: 'medium' | 'semibold' }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={{ width: `${100 / columns}%`, paddingRight: i % columns === columns - 1 ? 0 : 16 }}>
          <Text variant="legend" weight="regular" color="muted">
            {it.label}
          </Text>
          <Text size={15} weight={valueWeight} style={{ marginTop: 2 }} selectable>
            {it.value || '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SectionBody({ section }: { section: DetailSection }) {
  const { colors } = useTheme();
  const c = section.content;
  switch (c.kind) {
    case 'grid':
      return <InfoGrid items={c.items} />;
    case 'bullets':
      return (
        <View style={{ gap: 10 }}>
          {c.items.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name={c.icon} size={c.icon === 'circle' ? 8 : 20} color={c.tone} style={c.icon === 'circle' ? { marginTop: 7, marginHorizontal: 6 } : { marginTop: 1 }} />
              <Text size={15} style={{ flex: 1, lineHeight: 22 }} selectable>
                {t}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'text':
      return (
        <View style={{ gap: 8 }}>
          {c.paragraphs.map((p, i) => (
            <Text key={i} size={15} style={{ lineHeight: 22 }} selectable>
              {p}
            </Text>
          ))}
        </View>
      );
    case 'materials':
      return (
        <View style={{ marginVertical: -10 }}>
          {c.items.map((m, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: i === c.items.length - 1 ? 0 : 1,
                borderBottomColor: colors.line,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text size={15}>{m.name}</Text>
                {m.detail ? (
                  <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
                    {m.detail}
                  </Text>
                ) : null}
              </View>
              {m.qty ? (
                <Text size={15} weight="semibold" tabular>
                  {m.qty}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      );
    case 'image':
      return <Image source={{ uri: c.uri }} style={{ width: '100%', height: 180, borderRadius: 8, backgroundColor: colors.soft }} resizeMode="contain" />;
  }
}

/** Tarjeta con encabezado colapsable (ícono brandInk + título + resumen + flecha). */
export function DetailSectionCard({ section }: { section: DetailSection }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12, overflow: 'hidden' }}>
      <CollapsibleHeader
        title={section.title}
        summary={section.summary}
        icon={section.icon}
        defaultExpanded={section.defaultExpanded}
        divider={false}
      >
        <View style={{ marginHorizontal: -16, marginBottom: -16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.line }}>
          <SectionBody section={section} />
        </View>
      </CollapsibleHeader>
    </View>
  );
}
