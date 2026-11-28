import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import { router } from 'expo-router';
import { formatMoney } from '../utils/format';

export const C = { bg:'#F7F7F4', white:'#FFFFFF', text:'#20242C', muted:'#92969F', primary:'#3976D5', border:'#ECEDEA', green:'#32966F', red:'#D66B72', paleBlue:'#EDF3FC' };
export const money = formatMoney;
export function Page({title,subtitle,children, right, scroll = true}:{title:string;subtitle?:string;children:React.ReactNode;right?:React.ReactNode;scroll?:boolean}) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 16);
  const bottomPad = Math.max(insets.bottom + 16, 36);
  return (
    <View style={[s.page, { paddingTop: topPad }]}>
      <View style={s.header}>
        <Pressable onPress={()=>router.back()} style={s.back}>
          <ChevronLeft color={C.text}/>
        </Pressable>
        <View style={{flex:1}}>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text>:null}
        </View>
        {right}
      </View>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:bottomPad}}>
          {children}
        </ScrollView>
      ) : (
        <View style={{flex:1}}>{children}</View>
      )}
    </View>
  );
}
export function Field({label,...props}:{label:string}&TextInputProps){return <View style={{marginBottom:14}}><Text style={s.label}>{label}</Text><TextInput placeholderTextColor="#A8ADB5" {...props} style={[s.input,props.multiline&&{height:88,textAlignVertical:'top'},props.style]}/></View>}
export function Button({title,onPress,secondary=false,loading=false,disabled=false}:{title:string;onPress:()=>void;secondary?:boolean;loading?:boolean;disabled?:boolean}){return <Pressable onPress={onPress} disabled={loading||disabled} style={[s.button,secondary&&s.buttonSecondary,disabled&&{opacity:0.6}]}>{loading?<ActivityIndicator color={secondary?C.text:'#fff'}/>:<Text style={[s.buttonText,secondary&&{color:C.text}]}>{title}</Text>}</Pressable>}
export function SearchBox({value,onChangeText,placeholder='Cari data...'}:{value:string;onChangeText:(v:string)=>void;placeholder?:string}){return <View style={s.search}><Search size={18} color={C.muted}/><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#A8ADB5" style={{flex:1,color:C.text,fontSize:13}}/></View>}
export function Card({children,style}:{children:React.ReactNode;style?:any}){return <View style={[s.card,style]}>{children}</View>}
export function Empty({title='Belum ada data',desc='Data yang kamu tambahkan akan muncul di sini.'}:{title?:string;desc?:string}){return <View style={s.empty}><Text style={{fontSize:15,fontWeight:'800',color:C.text}}>{title}</Text><Text style={{fontSize:12,color:C.muted,marginTop:6,textAlign:'center'}}>{desc}</Text></View>}
export function AddButton({onPress,title='Tambah data'}:{onPress:()=>void;title?:string}){return <Pressable onPress={onPress} style={s.add}><Plus size={18} color="#fff"/><Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>{title}</Text></Pressable>}
export const s=StyleSheet.create({page:{flex:1,backgroundColor:C.bg,paddingHorizontal:20},header:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:22},back:{width:40,height:40,borderRadius:13,backgroundColor:C.white,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.border},title:{fontSize:21,fontWeight:'800',color:C.text},subtitle:{fontSize:11,color:C.muted,marginTop:3},label:{fontSize:12,fontWeight:'700',color:C.text,marginBottom:7},input:{backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:13,paddingHorizontal:14,paddingVertical:12,fontSize:13,color:C.text},button:{backgroundColor:C.primary,borderRadius:14,padding:15,alignItems:'center',justifyContent:'center',marginTop:8,minHeight:49},buttonSecondary:{backgroundColor:C.white,borderWidth:1,borderColor:C.border},buttonText:{color:'#fff',fontWeight:'800',fontSize:13},search:{height:47,backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:14,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:9,marginBottom:15},card:{backgroundColor:C.white,borderRadius:17,borderWidth:1,borderColor:C.border,padding:15,marginBottom:11},empty:{alignItems:'center',padding:35,backgroundColor:C.white,borderRadius:17,borderWidth:1,borderColor:C.border,marginTop:8},add:{backgroundColor:C.primary,borderRadius:13,paddingHorizontal:15,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:7}});
