/* ==========================================================================
   PIXEL ART
   Every small sprite in the game as data: the action icons, the meter glyphs,
   the case buttons, the headgear, the food, the mess and the heart.

   All of it used to be hand-written fillRect calls buried in three different
   modules — a hundred and forty lines of `g.fillRect(3,4,2,1)` that could only
   be changed by someone who could read them as a picture in their head. As
   rows of characters it is editable by eye in a text editor, and by hand in
   tools/editor.html.

   Each entry is a palette and one character per pixel: a space is
   transparent, and 0-9 then a-z index into `pal`. `ox`/`oy` mark where the
   drawing origin sits inside the grid, for the sprites that are drawn around
   a point rather than from a corner.

   The outline every icon and hat wears is NOT stored here. It is a pass over
   the finished grid in `pixCanvas`, so an edit cannot leave a sprite with a
   half-drawn border. Nothing here is baked at load: the renderers cache.
   ========================================================================== */
/*<data:PIX>*/
const PIX = {
  'icon.feed': { w:12, h:12,
    pal:['#a04a34','#82382a','#c46a4c','#d8d0b4'], rows:[
      '            ',
      '            ',
      '            ',
      ' 0000000   3',
      '102222001 33',
      '10222200333 ',
      '10000000333 ',
      '100000001 33',
      ' 0011111   3',
      '            ',
      '            ',
      '            '
    ] },
  'icon.play': { w:15, h:19,
    pal:['#2f6f6a','#a7dbd3','#5fb0a5','#df0000','#914848','#b4a329','#272727','#ffffff','#ffd700','#a45200','#292497','#590000'], rows:[
      '    8588858    ',
      '   888773338   ',
      '  88777733338  ',
      ' 8337777333888 ',
      '833377773377788',
      '833337773777778',
      '83333388a777778',
      '877777868773338',
      '877777a88333338',
      '877773377333338',
      '883333377733388',
      ' 8833337777338 ',
      '  88333777788  ',
      '   883377788   ',
      '    8588558    ',
      '     bbbbb     ',
      '      bbb      ',
      '     bbbbb     ',
      '    bbbbbbb    '
    ] },
  'icon.wash': { w:12, h:12,
    pal:['#4b7f99','#7fb2c9','#e8f4fa','#d6ecf4'], rows:[
      '        2   ',
      '    000     ',
      '    110   2 ',
      '   01100    ',
      '   13310    ',
      '  0133100   ',
      '  0111100   ',
      '  0111100  2',
      '  0011100   ',
      '   01110    ',
      '   00000 2  ',
      '           2'
    ] },
  'icon.care': { w:12, h:12,
    pal:['#8f3f26','#c2603c','#f2ded0','#e4e3cb'], rows:[
      '            ',
      ' 0000  0000 ',
      '001100001100',
      '011111111110',
      '011112311110',
      '011112311110',
      '011222233110',
      '001232333100',
      ' 0111331110 ',
      '  01133110  ',
      '   011110   ',
      '    0000    '
    ] },
  'icon.shop': { w:12, h:12,
    pal:['#5c4726','#b08a4a','#8a6a36','#d9a83f'], rows:[
      '    0000    ',
      '   0    0   ',
      '   0    0   ',
      '   0    0   ',
      ' 1111111110 ',
      ' 1111111110 ',
      ' 2222222220 ',
      ' 2233333320 ',
      ' 2233333320 ',
      ' 2222222220 ',
      ' 2222222220 ',
      ' 0000000000 '
    ] },
  'icon.coin': { w:12, h:12,
    pal:['#8a6a1e','#d9a83f','#f0d888'], rows:[
      '            ',
      '   011000   ',
      '  02111100  ',
      ' 0122001100 ',
      ' 0110000100 ',
      ' 0111001100 ',
      ' 0111001100 ',
      ' 0110000100 ',
      ' 0111001100 ',
      '  01111100  ',
      '   000000   ',
      '            '
    ] },
  'icon.hunger': { w:12, h:10,
    pal:['#d8d0b4','#82382a','#a04a34','#c46a4c','#b6b79b','#b7b7b7'], rows:[
      '  5   5   5 ',
      '  5   5   5 ',
      ' 5   5   5  ',
      ' 5   5   5  ',
      '            ',
      '400000000004',
      '400000000004',
      ' 4000000004 ',
      '  40000004  ',
      '   444444   '
    ] },
  'icon.energy': { w:12, h:12,
    pal:['#d9c04a','#f4e79a','#8a6a1e'], rows:[
      '      000   ',
      '     1102   ',
      '    1102    ',
      '   0000     ',
      '  0000000   ',
      '  2220002   ',
      '    0002    ',
      '   0002     ',
      '  0002      ',
      '  002       ',
      '  22        ',
      '            '
    ] },
  'icon.hygiene': { w:12, h:12,
    pal:['#4b7f99','#7fb2c9','#d6ecf4'], rows:[
      '     00     ',
      '     00     ',
      '    1110    ',
      '   121110   ',
      '   122110   ',
      '  01221100  ',
      '  01111100  ',
      '  01111100  ',
      '   011110   ',
      '    0000    ',
      '            ',
      '            '
    ] },
  'icon.joy': { w:12, h:9,
    pal:['#c96f86','#8f3050','#f0a8b8'], rows:[
      '            ',
      '  001  001  ',
      ' 1220000001 ',
      ' 1220000001 ',
      ' 1000000011 ',
      '  10000011  ',
      '   100011   ',
      '    1111    ',
      '     11     '
    ] },
  'icon.sound': { w:14, h:12,
    pal:['#3a2408','#1d4a33'], rows:[
      '              ',
      '    0   11    ',
      '   00 1   1   ',
      '  000  1   1  ',
      '00000   1  1  ',
      '00000   1  1  ',
      '00000   1  1  ',
      '00000   1  1  ',
      '  000  1   1  ',
      '   00 1   1   ',
      '    0   11    ',
      '              '
    ] },
  'icon.mute': { w:12, h:12,
    pal:['#3a2408','#c2603c'], rows:[
      '            ',
      '    0       ',
      '   00       ',
      '  000  1   1',
      '00000   1 1 ',
      '00000    1  ',
      '00000   1 1 ',
      '00000  1   1',
      '  000       ',
      '   00       ',
      '    0       ',
      '            '
    ] },
  'icon.bone': { w:12, h:12,
    pal:['#efe6cf','#b8ad90'], rows:[
      '            ',
      '      00    ',
      '      00    ',
      '      0001  ',
      '     00011  ',
      '    0001    ',
      '   0001     ',
      ' 00001      ',
      ' 0001       ',
      '   01       ',
      '   01       ',
      '            '
    ] },
  'icon.nest': { w:12, h:12,
    pal:['#efe3c4','#cfc3a4','#6b5230','#8a6a3c','#004a00'], rows:[
      '            ',
      '            ',
      '            ',
      '            ',
      '   400411   ',
      '  00001111  ',
      ' 204001141  ',
      '233333333332',
      '222222222222',
      '333333333333',
      '222222222222',
      '            '
    ] },
  'hat.frond': { w:12, h:11,
    pal:['#6f9c55','#ace08d','#326339'], rows:[
      '   000100   ',
      '  011   00  ',
      '  0  0011 0 ',
      '  00 1  2 1 ',
      '  01 0 01 0 ',
      '  01 01210  ',
      '  201 000   ',
      '   01       ',
      '   2002     ',
      '     01     ',
      '      00012 '
    ] },
  'hat.cap': { w:12, h:11,
    pal:['#b08a4a','#8a6a36','#503f21'], rows:[
      '            ',
      '  22222222  ',
      '  20000002  ',
      '  20000002  ',
      '  20000002  ',
      '222000000222',
      '211111111112',
      '211111111112',
      '            ',
      '            ',
      '            '
    ] },
  'hat.cone': { w:12, h:11,
    pal:['#d95f7f','#5fb0a5','#e8e3ac'], rows:[
      '            ',
      '     22     ',
      '     00     ',
      '    0000    ',
      '    2222    ',
      '   000000   ',
      '   000000   ',
      '  11111111  ',
      '  11111111  ',
      '            ',
      '            '
    ] },
  'hat.hardhat': { w:12, h:11,
    pal:['#c48c1c','#e0a92f'], rows:[
      '            ',
      '     00     ',
      '   111111   ',
      '  11111111  ',
      '  11111111  ',
      ' 1111111111 ',
      ' 1000000001 ',
      ' 1100000011 ',
      '            ',
      '            ',
      '            '
    ] },
  'hat.crown': { w:12, h:11,
    pal:['#d9a83f','#c04848','#b90000'], rows:[
      '            ',
      '0    00    0',
      '00   00   00',
      '000 0000 000',
      '000000000000',
      '000001200000',
      '000002100000',
      '            ',
      '            ',
      '            ',
      '            '
    ] },
  'item.berry': { w:8, h:9, ox:2, oy:4,
    pal:['#4e7a4a','#423388','#3f28aa','#9e98e7'], rows:[
      '        ',
      '   0 0  ',
      '    0   ',
      '    0   ',
      '  11112 ',
      '  13112 ',
      '  11112 ',
      '  22222 ',
      '        '
    ] },
  'item.fish': { w:9, h:6, ox:0, oy:2,
    pal:['#7fa3b8','#1a140e','#5b7c90','#c9dde6'], rows:[
      '         ',
      '   22   2',
      ' 20002 22',
      '23200222 ',
      '222222 22',
      '         '
    ] },
  'item.fern': { w:14, h:23, ox:6, oy:11,
    pal:['#3f6440','#6f9c55','#8fb763'], rows:[
      '        002   ',
      '       0022   ',
      '02     022  20',
      '002    02  200',
      ' 0022 0022200 ',
      '  0022022200  ',
      '   00202200   ',
      '    000200    ',
      '02   0220   20',
      '002  02    200',
      ' 002202  2200 ',
      '  00202 2200  ',
      '   00022200   ',
      '02  002200  20',
      '002  02 0  200',
      ' 0022 2  2200 ',
      '  0022022200  ',
      '   00202200   ',
      '    000200    ',
      '     0020     ',
      '      02      ',
      '      002     ',
      '       022    '
    ] },
  'item.cycad': { w:12, h:10, ox:2, oy:4,
    pal:['#a8863c','#8a6b2c','#d0ae5c','#5a4a2a'], rows:[
      '            ',
      '            ',
      '            ',
      '            ',
      '   0001     ',
      '   0201     ',
      '   0001     ',
      '   1111     ',
      '    33      ',
      '            '
    ] },
  'item.meat': { w:12, h:10, ox:2, oy:4,
    pal:['#a04a34','#c46a4c','#efe9d8','#82382a'], rows:[
      '            ',
      '            ',
      '            ',
      '            ',
      '  00000     ',
      '  01100     ',
      '  0000022   ',
      '  3333322   ',
      '            ',
      '            '
    ] },
  'item.cake': { w:12, h:10, ox:2, oy:4,
    pal:['#b83b45','#f0dcae','#d1a05e','#b8823f'], rows:[
      '            ',
      '            ',
      '            ',
      '    00      ',
      '  110011    ',
      '  222222    ',
      '  222222    ',
      '  222222    ',
      '  333333    ',
      '            '
    ] },
  'item.rock': { w:12, h:10, ox:2, oy:4,
    pal:['#8b8578','#a8a294','#6e6a5e'], rows:[
      '            ',
      '            ',
      '            ',
      '            ',
      '  000112    ',
      '  000002    ',
      '  000002    ',
      '  222222    ',
      '            ',
      '            '
    ] },
  'top.rex.a': { w:30, h:17, ox:15, oy:8,
    pal:['#241d13','#7e9c54','#a0b680','#5f713e','#e9dfba','#5b7940'], rows:[
      '           04440              ',
      '           00140              ',
      '          03110               ',
      '          01130    00         ',
      '         001100  00330        ',
      '       003311330033300 0000   ',
      '      0331111113333003011130  ',
      '    00311122221111111112211300',
      '  0031222222221122222122222244',
      ' 01222222222221111111112211300',
      ' 033333331111113333003111130  ',
      '  0000000331133003330000000   ',
      '         001100  00330        ',
      '         03110     00         ',
      '         01130                ',
      '        04100                 ',
      '       0440                   '
    ] },
  'top.rex.b': { w:30, h:17, ox:15, oy:8,
    pal:['#241d13','#7e9c54','#a0b680','#5f713e','#e9dfba','#5b7940'], rows:[
      '       0440                   ',
      '        04100                 ',
      '         01130                ',
      '         03110     00         ',
      '         001100  00330        ',
      '  00000003311330033300 0000   ',
      ' 033333331111113333003011130  ',
      ' 01222222222221111111112211300',
      '  0031222222221122222122222244',
      '    00311122221111111112211300',
      '      0331111113333003111130  ',
      '       00331133003330000000   ',
      '         001100  00330        ',
      '          01130    00         ',
      '          03110               ',
      '           00140              ',
      '           04440              '
    ] },
  'top.trike.a': { w:29, h:21, ox:14, oy:10,
    pal:['#2b1c10','#a06635','#b98e6a','#784d28','#efe6c8','#7d4a22'], rows:[
      '                             ',
      '            0  0             ',
      '           010010            ',
      '          03100110   00      ',
      '         0313000130 0330   0 ',
      '        031333301130333300040',
      '        03331133313031130440 ',
      '       03311111131111111440  ',
      '      0331112211111112204130 ',
      '    0031111222211222122111100',
      '  001122222222221222122122455',
      ' 0122222211222211222122111100',
      '  00033331112211111112214130 ',
      '     0003311111131111110440  ',
      '        03331133313031130440 ',
      '        031333303110333300040',
      '        0313000 03100330   0 ',
      '        0130     011000      ',
      '        010       010        ',
      '         0         0         ',
      '                             '
    ] },
  'top.trike.b': { w:29, h:21, ox:14, oy:10,
    pal:['#2b1c10','#a06635','#b98e6a','#784d28','#efe6c8','#7d4a22'], rows:[
      '                             ',
      '         0         0         ',
      '        010       010        ',
      '        0130     011000      ',
      '        0313000 03100330   0 ',
      '        031333303110333300040',
      '        03331133313031130440 ',
      '     0003311111131111111440  ',
      '  00033331112211111112204130 ',
      ' 0122222211222211222122111100',
      '  001122222222221222122122455',
      '    0031111222211222122111100',
      '      0331112211111112214130 ',
      '       03311111131111110440  ',
      '        03331133313031130440 ',
      '        031333301130333300040',
      '         0313000130 0330   0 ',
      '          03100110   00      ',
      '           010010            ',
      '            0  0             ',
      '                             '
    ] },
  'top.brachio.a': { w:32, h:19, ox:16, oy:9,
    pal:['#1b2422','#71958a','#96b1a8','#546f67','#e2e3bc','#88a894'], rows:[
      '            0                   ',
      '           010 00               ',
      '          00100110              ',
      '         03130 0130             ',
      '         01130001130            ',
      '         01333333130         0  ',
      ' 0000000033111111330   00000030 ',
      '0333333333111111113000033331510 ',
      '0122222222112222111112222221510 ',
      ' 00011222222222221222221130000  ',
      '    0031111122221111130000      ',
      '      0003111111113000          ',
      '        033111111330            ',
      '         01333333130            ',
      '        031100003110            ',
      '        03130   0310            ',
      '        0100     0110           ',
      '        010       00            ',
      '         0                      '
    ] },
  'top.brachio.b': { w:32, h:19, ox:16, oy:9,
    pal:['#1b2422','#71958a','#96b1a8','#546f67','#e2e3bc','#88a894'], rows:[
      '         0                      ',
      '        010       00            ',
      '        0100     0110           ',
      '        03130   0310            ',
      '        031100003110            ',
      '         01333333130            ',
      '        033111111330            ',
      '      0003111111113000          ',
      '    0031111122221111130000      ',
      ' 000112222222222212222211300 0  ',
      '0122222222112222111112222221010 ',
      '0333333333111111113000033331510 ',
      ' 0000000033111111330   00000330 ',
      '         01333333130        00  ',
      '         01130001130            ',
      '         03130 0130             ',
      '          00100110              ',
      '           010 00               ',
      '            0                   '
    ] },
  'top.compy.a': { w:18, h:11, ox:9, oy:5,
    pal:['#241d13','#c9a355','#d7bb81','#91753f','#e6cf94','#8a6c34'], rows:[
      '         0        ',
      '        010       ',
      '       010    0   ',
      '      01100000300 ',
      '   000311113112230',
      ' 0011222221221110 ',
      '0221111111100000  ',
      ' 0000001100       ',
      '      010         ',
      '     010          ',
      '      0           '
    ] },
  'top.compy.b': { w:18, h:11, ox:9, oy:5,
    pal:['#241d13','#c9a355','#d7bb81','#91753f','#e6cf94','#8a6c34'], rows:[
      '      0           ',
      '     010          ',
      '      010         ',
      ' 0000001100       ',
      '022111111110000   ',
      ' 0011222221221100 ',
      '   000311113112230',
      '      01100000330 ',
      '       010    00  ',
      '        010       ',
      '         0        '
    ] },
  'mess': { w:10, h:9, ox:4, oy:7,
    pal:['#6b4322','#8a5c33','#513218'], rows:[
      '          ',
      '   000    ',
      '   110    ',
      '  00000   ',
      '  00011   ',
      ' 0110002  ',
      '110000021 ',
      '2222222222',
      '          '
    ] },
  'badge.love': { w:7, h:6,
    pal:['#16120b','#d8546e','#f4a3b3'], rows:[
      ' 00 00 ',
      '0120110',
      '0111110',
      ' 01110 ',
      '  010  ',
      '   0   '
    ] },
  'badge.no': { w:7, h:7,
    pal:['#16120b','#e0583c'], rows:[
      '00   00',
      '010 010',
      ' 01010 ',
      '  010  ',
      ' 01010 ',
      '010 010',
      '00   00'
    ] },
  'heart': { w:8, h:7, ox:0, oy:1,
    pal:['#8f2f46','#f6b3c0','#e2697c'], rows:[
      ' 00 00  ',
      '0112220 ',
      '0122220 ',
      '0022200 ',
      ' 00200  ',
      '  000   ',
      '   0    '
    ] },
  'case': { w:96, h:155,
    pal:['#42290a','#c08f43','#dcb060','#8d6527','#a9782f','#d8ccac','#f2ead2','#a08e69','#5d5138','#0e1417','#05090a','#b9aa85','#33200a','#2a1b09','#362209','#a67a35'], rows:[
      '                                             0  0  0                                            ',
      '                                    0    0   0  2  0  0    0                                    ',
      '                                    0 00 0   0 040 0  0 00 0                                    ',
      '                                    002400   0024400  002400                                    ',
      '                            0    0  024440000024444000024440  0    0                            ',
      '                            0 00d000000000002222222200000000000d00 0                            ',
      '                            0224000222222222111111112222222220022400                            ',
      '                     0 0 00000022221111111111111111111111111122220000000 0 0                    ',
      '                     0220002222111111111111111111111111111111111122220002200                    ',
      '                    00002221111111111111111111111111111111111111111112220000                    ',
      '                 d000222111111111111111111111111111111111111111111111111222000d                 ',
      '                0002211111111111111111111111111111111111111111111111111111122000                ',
      '              00022111111111111111111111111111111111111111111111111111111111122000              ',
      '            d0022111111111111111111111111111111111111111111111111111111111111112200d            ',
      '           00021111111111111111111111111111111111111111111111111111111111111111112000           ',
      '          0022111111111111111111111111111111111111111111111111111111111111111111112200          ',
      '         002211111111111111111111111111111111111111111111111111111111111111111111111200         ',
      '        00211111111111111111111111111111111111111111111111111111111111111113111111111200        ',
      '       0021111111111111111111111111111111111111111111111111111111111111111111111111111200       ',
      '      002111111111111111111111111111111111111111111111111111111111111111111111111111111200      ',
      '     00211111111111111111111111111111111111111111111111111111111111111111111111111111111200     ',
      '    0021111111111111111111111111111111111111111111111111111111111111111111111111111111111200    ',
      '   d0211111111111111111111111111111111111111111111111111111111111111111111111111111111111120d   ',
      '   001111111111111111111111111111111111111111111111111111111111111111111211111111111111111100   ',
      '  00211111111111111111111111113111111111111111111111111111111111111111111111111111111111111200  ',
      '  02111111111111111111111111111111111111111111111111111111111111111111111111111111111111111120  ',
      ' 0011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111100 ',
      ' 0031111111111111111111111111111131111111111111111111111111111111111111111111113111111111111100 ',
      ' 0211111111111111111111111111111111111111111111111111111111111111111111111111111111111111111120 ',
      '001111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111100',
      '001111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111100',
      '001118888888888888888888888888888888888888888888888888888888888888888888888888888888888888811100',
      '0218aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa8120',
      '011abbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabba110',
      '018abbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabba810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '038aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '038aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa810',
      '018abbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabba810',
      '010abbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabba010',
      '0118aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa8110',
      '011008888888888888888888888888888888888888888888888888888888888888888888888888888888888888800110',
      '011110000000000000000000000000000000000000000000000000000000000000000000000000000000000000011110',
      '011111111111111111111111111111111111111111111111111111111111121111111111111111111111111111111110',
      '011111111111111111111111111111111111111111111111111111111111113111111111111111111111111111111110',
      '011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111110',
      '011111111111111111111111111111111111111111111111111111111111111111111113111111111111111111111110',
      '011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111110',
      '011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111110',
      '011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111110',
      '011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111110',
      '011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111110',
      '011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111110',
      '011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111110',
      '031111111111111111111111111111111111111111111111111111111111111111111111111111111111311111111130',
      '001111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111100',
      '001111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111300',
      'd0311111111111111111111111111111111111111111111111111111111111111111111111111111111111111111130d',
      ' 0011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111100 ',
      ' 0031111111111111111111111111111111111111111111111111111111111111111111111111111111111111111300 ',
      ' c00111111111111111111111111111111111111111111111111111111111111111111111111111111111111111100c ',
      '  d031111111111111111111111111111111111111111111111111111111111211111111111111111111111111130d  ',
      '   003111111111111111111111111111111111111111111111111111111111111111111111111111111111111300   ',
      '   c0031111111111111111111111111111111111131111111111111111111111111111111111111111111111300c   ',
      '    c00331111111111111111111111111111111111111111111111111111111111111111111111111111113300c    ',
      '     c000311111111111111111111111111111111111111111111111111111111111111111111111111113000c     ',
      '      cd00331111111111111111111111111111111111111111111111111111111111111111111111113300dc      ',
      '        c000331111111111111111111111111113111111111111111111111111111111111111111133000c        ',
      '         cd00033111111111111111111111111111111111111111111111111111111111111111133000dc         ',
      '           c000033111111112111111111111111111111111111111111111111111111111111330000c           ',
      '            cc00003331111111111111111111111111111111111111111111111111111113330000cc            ',
      '              ccd00003333111111111111111111111111111111111111111111111133330000dcc              ',
      '                 ccd00000333311111111111111111111111111111111111111333300000dcc                 ',
      '                    ccd00000033333333311111111111111111111333333333000000dcc                    ',
      '                       cccd000000000003333333333333333333300000000000dccc                       ',
      '                           ccccdd000000000000000000000000000000ddcccc                           ',
      '                                 cccccccccccccccccccccccccccccc                                 ',
      '                                                                                                '
    ] },
};
/*</data>*/

/* A picture of the case, imported rather than drawn, and promoted into the
   project on purpose.

   The house rule is that this game ships no image assets, and it still ships
   none: this is empty, and an imported case lives in Store on the machine that
   imported it. Promoting one is the deliberate exception — it makes the picture
   the game's case for everyone and puts its whole weight in the built file, so
   it is a press of its own in the editor and not a side effect of importing.

   `let`, not `const`, because the editor assigns it before saving. Empty string
   means "there is no promoted picture"; the case falls back to PIX.case. */
/*<data:CASE_SKIN>*/
let CASE_SKIN = '';
/*</data>*/
/* Where a skin that has not been promoted lives: this machine, and nowhere
   else, alongside which of the two faces the case is wearing. Named here rather
   than in the game or the editor, because both read them and only one of those
   two files is loaded by the other. */
const CASE_KEY = 'paleopal.case.skin';
const CASE_MODE_KEY = 'paleopal.case.mode';

/* Per-stage multipliers. Every feature that grows on its own schedule gets its
   own column — merging any two of them has produced a bad sprite at least once.

   A scale column and a set of ratios is not growth. With `s` doing most of the
   work the juvenile, subadult and adult were one animal at three sizes with a
   slightly smaller head each time, and the only stage that read as its own
   thing was the hatchling. Growing up changes what an animal *has*, not only
   how big the parts are, so four of these columns turn features on and off
   rather than scaling them:

   `muzzle` is snout DEPTH, and it is separate from `snout`, which is snout
   length. A young tyrannosaur has a shallow, narrow muzzle in front of a large
   braincase; the deep boxy skull is an adult feature and arrives late. Driving
   both off one number gives a hatchling either an adult's slab of a face or a
   pinched adult.

   `bulk` is how deep the trunk and neck are for a given length. Juveniles are
   slab-sided and leggy, adults are barrel-chested with a thick neck. It is the
   difference you actually see across a room.

   `torso` is trunk LENGTH. Young animals are short-bodied and big-headed; the
   body catches up last.

   `fuzz` is protofeather coverage. Juvenile tyrannosaurs are reconstructed
   with a substantial coat that reduces with age, which is both well supported
   and the single most visible thing that can change between two stages of the
   same animal.

   `frill` is separate from `horn` for the reason `snout` is separate from
   `head`: a baby Triceratops already has a frill, deeply scalloped and
   obvious, while its horns are barely stubs.

   `hornBend` is the ontogenetic sequence Horner and Goodwin read off a series
   of ten skulls: the postorbital horns start as straight stubs, curve
   backward in juveniles, straighten out in subadults, then recurve forward in
   adults. Negative is backward, positive forward. */
/*<data:STAGE>*/
const STAGE = [
  {
    key:'hatchling',
    label:'Hatchling',
    s:.44,
    head:1.62,
    snout:.58,
    muzzle:.62,
    neck:.44,
    limb:.68,
    tail:.54,
    bulk:1.34,
    torso:.7,
    fuzz:1,
    horn:.14,
    frill:.5,
    hornBend:0
  },
  {
    key:'juvenile',
    label:'Juvenile',
    s:.64,
    head:1.38,
    snout:.76,
    muzzle:.74,
    neck:.68,
    limb:.83,
    tail:.76,
    bulk:1.12,
    torso:.84,
    fuzz:.68,
    horn:.48,
    frill:.7,
    hornBend:-1
  },
  {
    key:'subadult',
    label:'Subadult',
    s:.83,
    head:1.18,
    snout:.9,
    muzzle:.89,
    neck:.87,
    limb:.93,
    tail:.9,
    bulk:1.04,
    torso:.94,
    fuzz:.3,
    horn:.8,
    frill:.86,
    hornBend:-.15
  },
  {
    key:'adult',
    label:'Adult',
    s:1,
    head:1.06,
    snout:1,
    muzzle:1,
    neck:1,
    limb:1,
    tail:1,
    bulk:1,
    torso:1,
    fuzz:.06,
    horn:1,
    frill:1,
    hornBend:1
  }
];
/*</data>*/

/* ---------------------- proportions, per species ---------------------------
   These were literals scattered through fifty lines of control points inside
   each draw function, which made "extend the tail" a job for someone willing
   to read the whole function first. Every number is in local units at adult
   size; the STAGE columns above multiply them. tools/editor.html puts a
   slider on each one.

   Where a draw function needs two stations at a fixed ratio — the four points
   down a tail, say — they are written as exact fractions of the length here
   (TL*23/72), not as rounded decimals. TL*.32 is 23.04, and the sprite moves.
   -------------------------------------------------------------------------- */
/*<data:REX_TUNE>*/
const REX_TUNE = {
  hipH:46,
  shoulder:18,
  backH:24,
  withersH:25,
  bellyD:9,
  neckLen:26,
  neckDrop:7,
  headLen:32,
  headDepth:15.5,
  tailLen:109,
  tailBase:18,
  armLen:9.5,
  fuzzLen:10
};
/*</data>*/
/*<data:TRI_TUNE>*/
const TRI_TUNE = {
  hipH:44.89,
  shoulderDrop:2,
  shoulder:17.78,
  hipBack:24,
  withersH:21.23,
  backH:17,
  rumpH:18.11,
  bellyD:23.48,
  chestD:15,
  waistD:1,
  neckLen:20.73,
  neckDrop:3.65,
  neckThick:18.75,
  headLen:20.85,
  headDepth:10.5,
  frillW:15.6,
  frillH:20.2,
  frillTilt:.4,
  hornLen:1.85,
  tailLen:70.16,
  tailBase:15,
  haunchR:9.5,
  shoulderR:9,
  epi:.08
};
/*</data>*/
/*<data:BRA_TUNE>*/
const BRA_TUNE = {
  hindH:46,
  foreRatio:1.22,
  shoulder:14,
  hipBack:30,
  bodyD:44,
  neckLen:58,
  neckThick:26,
  headLen:16,
  headDepth:8,
  crestH:2.05,
  tailLen:86
};
/*</data>*/

/* ------------------------- colours, per species ---------------------------
   The material ramps each species is built from. `beak` is optional and
   falls back to `horn`. */
/*<data:REX_SPEC>*/
const REX_SPEC = {
  skin:'#7e9c54',
  belly:'#b8bd80',
  crest:'#5b7940',
  horn:'#e9dfba',
  mouth:'#8e4a45',
  outline:'#241d13'
};
/*</data>*/

/* The Triceratops carries two extra materials.

   `shield` is the frill, pulled well away from the body ramp: on the flank
   colours the shield was separated from the neck by nothing but the outline,
   and a shield that does not read as a shield is most of this animal's
   silhouette thrown away.

   `beak` is the rostral and predentary. On the horn ramp they came out
   near-white, which put two blobs of bone on the front of the face with no
   edge between them and the horn sheaths above. Keratin, but duller. */
/*<data:TRI_SPEC>*/
const TRI_SPEC = {
  skin:'#a06635',
  belly:'#c8975e',
  crest:'#7d4a22',
  horn:'#efe6c8',
  shield:'#cfa068',
  beak:'#b3925e',
  mouth:'#7e3a30',
  outline:'#26190f'
};
/*</data>*/

/*<data:BRA_SPEC>*/
const BRA_SPEC = {
  skin:'#71958a',
  belly:'#a9ba8e',
  crest:'#88a894',
  horn:'#e2e3bc',
  mouth:'#4c3a35',
  outline:'#1b2422'
};
/*</data>*/

/* --------------------------------- skins -----------------------------------
   A skin swaps the three body ramps and paints an optional pattern onto the
   mark layer. Patterns are deterministic so a coat does not crawl between
   animation frames.
   -------------------------------------------------------------------------- */
/*<data:SKINS>*/
const SKINS = {
  rex:[
    {
      id:'wild',
      name:'Wild type',
      cost:0,
      pattern:'none',
      skin:'#7e9c54',
      belly:'#b8bd80',
      crest:'#5b7940',
      mark:'#4a6634',
      note:'The olive coat it hatched in.'
    },
    {
      id:'ash',
      name:'Ashfall',
      cost:70,
      pattern:'bands',
      skin:'#6f7a72',
      belly:'#a9b0a2',
      crest:'#4a534d',
      mark:'#39413c',
      note:'Cold grey, charcoal banding across the flank into tail rings.'
    },
    {
      id:'ember',
      name:'Ember',
      cost:120,
      pattern:'patches',
      skin:'#a8603a',
      belly:'#d69a5e',
      crest:'#7c4224',
      mark:'#71321a',
      note:'Rust and scorch marks. Loud, and it knows it.'
    },
    {
      id:'canopy',
      name:'Canopy',
      cost:170,
      pattern:'speckle',
      skin:'#4f7a4a',
      belly:'#9dbd7a',
      crest:'#395c37',
      mark:'#93b25c',
      note:'Deep forest green flecked with light through leaves.'
    }
  ],
  trike:[
    {
      id:'wild',
      name:'Wild type',
      cost:0,
      pattern:'none',
      skin:'#ab7040',
      belly:'#ca9b64',
      crest:'#8a5228',
      mark:'#7a4522',
      note:'The tan coat it hatched in.'
    },
    {
      id:'chalk',
      name:'Chalk',
      cost:70,
      pattern:'spots',
      skin:'#c3ab8c',
      belly:'#e6d8bc',
      crest:'#95805f',
      mark:'#8a7050',
      note:'Bleached bone with dark rosettes.'
    },
    {
      id:'ochre',
      name:'Ochre',
      cost:120,
      pattern:'bands',
      skin:'#c26a30',
      belly:'#e8a75c',
      crest:'#8e4620',
      mark:'#6f2f18',
      note:'A display animal. Banding follows the ribs and rings the tail.'
    },
    {
      id:'basalt',
      name:'Basalt',
      cost:170,
      pattern:'patches',
      skin:'#5c6470',
      belly:'#98a1ad',
      crest:'#3f4650',
      mark:'#333944',
      note:'Volcanic grey-blue with darker plates.'
    }
  ],
  brachio:[
    {
      id:'wild',
      name:'Wild type',
      cost:0,
      pattern:'none',
      skin:'#71958a',
      belly:'#a9ba8e',
      crest:'#88a894',
      mark:'#5c7f74',
      note:'The sage coat it hatched in.'
    },
    {
      id:'dune',
      name:'Dune',
      cost:70,
      pattern:'patches',
      skin:'#b9a173',
      belly:'#ded0a2',
      crest:'#c6b088',
      mark:'#8c7548',
      note:'Sand and dry grass. Vanishes on the floodplain.'
    },
    {
      id:'slate',
      name:'Slate',
      cost:120,
      pattern:'bands',
      skin:'#6d7d92',
      belly:'#a9b6c4',
      crest:'#7f8fa2',
      mark:'#3f4b5c',
      note:'Storm grey, shadow banding down the neck and out the tail.'
    },
    {
      id:'fernwood',
      name:'Fernwood',
      cost:170,
      pattern:'spots',
      skin:'#4e7a63',
      belly:'#9dba8e',
      crest:'#5f8a72',
      mark:'#8fb27c',
      note:'Wet forest green dappled with pale rings.'
    }
  ]
};
/*</data>*/
function skinOf(spId, skinId){
  const list = SKINS[spId];
  return list.find(k => k.id === skinId) || list[0];
}

/* ---------------------- per species, per stage -----------------------------
   STAGE is the growth curve every animal shares, and each species' TUNE table
   is its proportions at adult size. Between them they cover "all tyrannosaurs
   have a shallow muzzle when young" and "this tyrannosaur has a long tail".
   Neither covers "this species, at this age, departs from both" — which is
   most of what growth actually is once you look closely at an animal.

   So: one row per stage per species, and any key in it REPLACES the value it
   names, whether that is a STAGE column or a TUNE key. A key that is absent is
   inherited. Replacement rather than a multiplier, because several of these
   values are legitimately zero or negative — `hornBend` is 0 on a hatchling
   and -1 on a juvenile, and no multiplier can move either of those.

   The Triceratops rows below are the epoccipital depths that used to be a
   table of their own: the rim scallops are deep deltoid knobs on a hatchling
   and low spindles fused into the margin on an adult, which is exactly a
   per-species per-stage value and had no home before this.
   -------------------------------------------------------------------------- */
/*<data:SPECIES_STAGE>*/
const SPECIES_STAGE = {
  rex:[
    { headLen:23, headDepth:10, armLen:9.5, backH:23.5 },
    { headLen:28 },
    { headLen:30, muzzle:1.18 },
    { s:1, armLen:8, head:1.24, limb:1.13 }
  ],
  trike:[
    { epi:.22, rumpH:17 },
    { epi:.17, hornBend:.05 },
    { epi:.12, hornBend:.7 },
    { hornBend:.85, horn:1.2, frill:1.27, frillTilt:.4 }
  ],
  brachio:[
    {
      tailLen:105.5,
      bodyD:47,
      hipBack:30.5,
      neckLen:69.5,
      headLen:19,
      neckThick:29,
      foreRatio:1.22,
      hindH:53.5,
      bulk:1.27,
      muzzle:1.05,
      neck:.64,
      crestH:4,
      shoulder:14,
      hornBend:0
    },
    {  },
    {  },
    { tailLen:112.5 }
  ]
};
/*</data>*/

/* ------------------------------- gear fit ---------------------------------
   Where one hat sits on one animal, when the species' own anchor is not quite
   right for it. The anchor is a place on the skull and it is the same place
   for every hat; a party cone and a bone crown are not the same shape and do
   not want the identical spot, and that difference is taste, not anatomy, so
   it lives here as data rather than in the draw functions.

   `dx` moves it toward the tail and `dy` moves it down the screen, so a hat
   that should ride higher takes a negative `dy`. Both are in sprite units, so
   they scale with the animal and a fit made on an adult still holds on a
   hatchling. `s` multiplies the width the species asked for. An absent
   species, an absent hat or an absent field all mean "no change", so this
   table only ever says the things that are not already right.

   `at` is the exception to that inheritance, one growth stage at a time, and
   it is the same arrangement `SPECIES_STAGE` has for proportions: the fit on
   the hat is what that hat does on that animal at every age, and a row under
   `at` is where one age departs from it. Sizes are what usually need it — a
   crown in proportion on an adult skull is a bucket on a hatchling, and the
   two heads are not the same shape, only the same animal later.

   The Gear tab in `tools/editor.html` writes all of it by dragging the hat
   around on the animal, which is the only sane way to set numbers whose whole
   meaning is where something looks right.
   -------------------------------------------------------------------------- */
/*<data:GEAR_FIT>*/
const GEAR_FIT = {
  rex:{
    frond:{ dx:4.1, dy:-.4, at:{ subadult:{ dx:6.1, dy:-.9 } } },
    cap:{ dx:4.4, dy:1.1, s:1.19 },
    cone:{
      dx:8.1,
      dy:3.1,
      s:1.28,
      at:{
        hatchling:{ dx:8.1, dy:-.3 },
        juvenile:{ dx:8.4, dy:-1 },
        subadult:{ dx:7.4, dy:-.7 },
        adult:{ dx:7.2, dy:-.3 }
      }
    },
    hardhat:{
      at:{
        hatchling:{ dx:6, dy:5.9, s:2.1 },
        juvenile:{ dx:7, dy:1.7, s:1.29 },
        subadult:{ dx:6.1, dy:-.5 },
        adult:{ dx:7.5, dy:-.6, s:1.07 }
      }
    },
    crown:{
      at:{
        hatchling:{ dx:5.9, dy:4.6, s:.65 },
        juvenile:{ dx:8.8, s:1.12 },
        subadult:{ dx:7, dy:.2 },
        adult:{ dx:7.5, dy:-.6 }
      }
    }
  },
  trike:{  },
  brachio:{
    frond:{
      dx:-.9,
      dy:1.5,
      at:{
        hatchling:{ dx:6, dy:2.3 },
        juvenile:{ dx:-1.4, dy:2.4 },
        subadult:{ dx:-.5, dy:-1.1 },
        adult:{ dx:-2.1, dy:1.8 }
      }
    },
    cap:{
      at:{
        hatchling:{ s:2.02, dx:5.5, dy:6.2 },
        juvenile:{ s:1.98, dx:2.9, dy:7.6 },
        subadult:{ s:2.05, dx:3.7, dy:9.2 },
        adult:{ dy:7.3, s:1.68, dx:2.4 }
      }
    },
    cone:{
      at:{
        hatchling:{ dx:6.2, dy:3.5, s:1.29 },
        juvenile:{ dy:5.7, s:1.22, dx:1.8 },
        subadult:{ dx:1.5, dy:5.9, s:1.21 },
        adult:{ s:1.43, dx:2.4, dy:7.9 }
      }
    },
    hardhat:{
      at:{
        adult:{ s:1.4, dy:8.5, dx:3.6 },
        hatchling:{ dx:4.1, dy:5.5, s:1.71 },
        juvenile:{ s:1.55, dx:2.4, dy:6.6 },
        subadult:{ s:1.37, dx:2.5, dy:8.1 }
      }
    },
    crown:{
      at:{
        hatchling:{ s:1.72, dx:6.9, dy:7.5 },
        juvenile:{ s:1.58, dx:3.8, dy:5.7 },
        subadult:{ s:1.35, dx:2.2, dy:7.2 },
        adult:{ s:1.24, dx:2.1, dy:7 }
      }
    }
  }
};
/*</data>*/

/* The one place a fit is resolved: the hat's own row, then whatever the stage
   overrides on top of it. Read through this rather than reaching into
   GEAR_FIT, the same way everything reads proportions through artFor(). */
function gearFor(spId, hatId, stage){
  const base = (GEAR_FIT[spId] || {})[hatId] || {};
  const at = (base.at || {})[(STAGE[stage] || {}).key] || {};
  const pick = k => (at[k] !== undefined ? at[k] : base[k]);
  return { dx: pick('dx') || 0, dy: pick('dy') || 0, s: pick('s') || 1 };
}

/*<data:HABITAT_ART>*/
const HABITAT_ART = {
  valley:{
    horizon:108,
    range:{
      points:[
        [-112, 58],
        [-84, 38],
        [-62, 50],
        [-34, 26],
        [-2, 50],
        [36, 36],
        [66, 54],
        [116, 22],
        [148, 46],
        [194, 32],
        [230, 52],
        [268, 20],
        [298, 42],
        [336, 32]
      ]
    },
    skyline:[
      [-112, 66],
      [-96, 52],
      [-78, 60],
      [-60, 44],
      [-44, 63],
      [-28, 73],
      [-12, 61],
      [0, 70],
      [25, 63],
      [52, 79],
      [96, 54],
      [135, 74],
      [183, 64],
      [224, 82],
      [243, 65],
      [262, 76],
      [284, 50],
      [302, 68],
      [318, 57],
      [336, 72]
    ],
    slot:[38, 140],
    item:'fern'
  },
  lagoon:{
    horizon:98,
    range:{
      points:[
        [112, 97],
        [126, 91],
        [138, 84],
        [146, 86],
        [156, 80],
        [166, 88],
        [182, 97]
      ]
    },
    skyline:[
      [-112, 70],
      [-100, 62],
      [-86, 72],
      [-70, 79],
      [-52, 88],
      [-38, 93],
      [-28, 94],
      [-17, 88],
      [-7, 94],
      [0, 94],
      [38, 93],
      [49, 85],
      [62, 87],
      [74, 94],
      [158, 94],
      [171, 90],
      [185, 94],
      [224, 94],
      [237, 91],
      [246, 94],
      [270, 94],
      [290, 87],
      [304, 90],
      [320, 77],
      [336, 72]
    ],
    slot:[187, 140],
    item:'fish'
  },
  ashfall:{
    horizon:111,
    range:{
      points:[
        [-112, 50],
        [-90, 30],
        [-74, 42],
        [-52, 22],
        [-30, 46],
        [-8, 40],
        [30, 58],
        [210, 58],
        [246, 36],
        [266, 46],
        [290, 20],
        [312, 40],
        [336, 28]
      ]
    },
    skyline:[
      [-112, 60],
      [-94, 74],
      [-76, 56],
      [-56, 70],
      [-40, 62],
      [-28, 71],
      [-11, 84],
      [0, 82],
      [27, 69],
      [54, 75],
      [73, 60],
      [104, 85],
      [157, 73],
      [194, 83],
      [224, 70],
      [239, 81],
      [252, 67],
      [268, 78],
      [288, 58],
      [306, 72],
      [322, 64],
      [336, 76]
    ],
    slot:[42, 140],
    item:'rock'
  },
  gorge:{
    horizon:104,
    range:{
      points:[
        [-112, 36],
        [-74, 36],
        [-64, 46],
        [-26, 46],
        [-16, 38],
        [52, 38],
        [62, 50],
        [104, 50]
      ]
    },
    skyline:[
      [-112, 46],
      [-96, 54],
      [-80, 42],
      [-60, 58],
      [-42, 52],
      [-28, 61],
      [-15, 54],
      [0, 58],
      [34, 57],
      [43, 74],
      [78, 74],
      [84, 101],
      [136, 103],
      [146, 68],
      [189, 66],
      [200, 54],
      [224, 57],
      [241, 51],
      [252, 60],
      [270, 48],
      [292, 56],
      [314, 40],
      [336, 50]
    ],
    slot:[185, 140],
    item:'rock'
  },
  boreal:{
    horizon:106,
    range:{
      snow:30,
      points:[
        [-112, 52],
        [-86, 24],
        [-64, 40],
        [-34, 12],
        [-4, 42],
        [28, 28],
        [66, 50],
        [118, 8],
        [156, 34],
        [198, 20],
        [236, 44],
        [280, 2],
        [310, 30],
        [336, 18]
      ]
    },
    skyline:[
      [-112, 50],
      [-98, 34],
      [-84, 52],
      [-66, 26],
      [-48, 48],
      [-28, 63],
      [-11, 80],
      [0, 82],
      [21, 60],
      [37, 75],
      [66, 44],
      [85, 66],
      [115, 52],
      [140, 78],
      [168, 49],
      [195, 69],
      [224, 55],
      [237, 73],
      [252, 48],
      [268, 62],
      [288, 30],
      [306, 52],
      [322, 38],
      [336, 56]
    ],
    slot:[40, 140],
    item:'cycad'
  }
};
/*</data>*/

/*<data:POSE_ART>*/
const POSE_ART = {
  eat:[
    { body:0, legPhase:0, jaw:.7, droop:.45, tail:.18 },
    { body:0, legPhase:0, jaw:0, droop:.45, tail:-.08 }
  ],
  cheer:[
    { body:1.8, legPhase:0, jaw:0, tail:.35, eye:2 },
    { body:0, legPhase:0, jaw:0, tail:-.18, eye:2 }
  ],
  wary:[
    { body:-.5, legPhase:0, jaw:0, droop:-.2, tail:0 },
    { body:0, legPhase:0, jaw:0, droop:0, tail:0 }
  ],
  inspect:[
    { body:0, legPhase:0, jaw:0, droop:.45, tail:.1 },
    { body:0, legPhase:0, jaw:0, droop:.7, tail:.1 }
  ],
  /* Sleep, and the two knobs only it uses.

     `fold` settles the animal onto the ground: the hips and shoulders come
     down, the legs fold under rather than shortening, and the tail lays out
     along the soil. `curl` brings the neck back over the body and the head
     down onto it. Both are read by each species' own draw function, because
     what a resting theropod does with its legs and what a resting sauropod
     does with its neck are not the same thing — see the notes in each file.

     Two frames is one slow breath. `body` is the breath and nothing else now;
     the settling that used to live in it is `fold`. */
  sleep:[
    { body:.3, legPhase:0, jaw:0, droop:1.5, tail:.1, fold:1, curl:1, eye:1 },
    { body:-.5, legPhase:0, jaw:0, droop:1.42, tail:.03, fold:1, curl:.95, eye:1 }
  ]
};
/*</data>*/

/* ------------------------------- habitats ---------------------------------
   The palette half of each habitat. The painters that go with them —
   landmark, treeline, floor, and whatever moves — are code and stay in
   04-world.js, which merges the two halves back together.

   `sky` gives the two sky colours for each phase, because the sky is half the
   screen and is the one part that cannot be derived. `ground` gives the six
   ground materials at DAY only: dawn, dusk and night are mixed from them by
   PHASE_MIX.
   -------------------------------------------------------------------------- */
/*<data:BIOME_ART>*/
const BIOME_ART = {
  valley:{
    id:'valley',
    name:'Mystical valley',
    cost:0,
    note:'Open ground under one ancient, impossible araucaria. Where every animal starts.',
    sky:{
      night:['#0a1124', '#28374f'],
      dawn:['#2c3f70', '#e39a6c'],
      day:['#4d9dc9', '#c3e2d8'],
      dusk:['#2b2854', '#da834b']
    },
    ground:{
      far:'#8fa79d',
      mid:'#6c8b6f',
      tree:'#3e5a44',
      grass:'#78a051',
      dirt:'#a5825a',
      water:'#6fa6b8'
    },
    tint:{
      night:'rgba(16,24,54,.44)',
      dawn:'rgba(196,124,84,.13)',
      day:'rgba(0,0,0,0)',
      dusk:'rgba(96,62,116,.20)'
    }
  },
  lagoon:{
    id:'lagoon',
    name:'Salt lagoon',
    cost:130,
    note:'A warm shallow sea behind a bar of pale sand. Sea stacks on the horizon.',
    sky:{
      night:['#08111f', '#1e3448'],
      dawn:['#34497a', '#f0a878'],
      day:['#58a8d6', '#d8ecec'],
      dusk:['#2f2a58', '#e0864c']
    },
    ground:{
      far:'#b7c3c0',
      mid:'#7f9a92',
      tree:'#4a6a52',
      grass:'#a8b47a',
      dirt:'#d6c69a',
      water:'#59a8c0'
    },
    tint:{
      night:'rgba(14,26,56,.42)',
      dawn:'rgba(212,140,88,.14)',
      day:'rgba(0,0,0,0)',
      dusk:'rgba(112,64,104,.20)'
    }
  },
  ashfall:{
    id:'ashfall',
    name:'Ash flats',
    cost:170,
    note:'The valley after the mountain woke. Dust in the air and nothing green left standing.',
    sky:{
      night:['#120e1c', '#2e2634'],
      dawn:['#4a3c58', '#e08a5c'],
      day:['#7e8faa', '#d3cdc4'],
      dusk:['#3a2a44', '#d46a3c']
    },
    ground:{
      far:'#8b8496',
      mid:'#6a6472',
      tree:'#3a3640',
      grass:'#6e6a63',
      dirt:'#8e857c',
      water:'#6a7078'
    },
    tint:{
      night:'rgba(20,16,34,.46)',
      dawn:'rgba(200,120,76,.15)',
      day:'rgba(150,132,110,.10)',
      dusk:'rgba(120,64,60,.22)'
    }
  },
  gorge:{
    id:'gorge',
    name:'Fern gorge',
    cost:210,
    note:'A cut in the plateau with a fall at the head of it. Wet, green and loud.',
    sky:{
      night:['#070e18', '#1c2a34'],
      dawn:['#2e3f60', '#dba888'],
      day:['#4f93b0', '#cfe4d6'],
      dusk:['#262848', '#c07a54']
    },
    ground:{
      far:'#7d9285',
      mid:'#55705c',
      tree:'#2e4a38',
      grass:'#5f8f4e',
      dirt:'#6f5c46',
      water:'#7fc0c4'
    },
    tint:{
      night:'rgba(12,22,44,.46)',
      dawn:'rgba(180,124,92,.13)',
      day:'rgba(0,0,0,0)',
      dusk:'rgba(84,58,104,.22)'
    }
  },
  boreal:{
    id:'boreal',
    name:'Polar dawn',
    cost:260,
    note:'High-latitude forest under a glacier. Dinosaurs lived here, in the dark half of the year.',
    sky:{
      night:['#060c1a', '#17253c'],
      dawn:['#2a3a68', '#eab48c'],
      day:['#6fa8d0', '#e6eef2'],
      dusk:['#26244e', '#c98a6a']
    },
    ground:{
      far:'#b9c6d6',
      mid:'#8ea0b2',
      tree:'#2d4444',
      grass:'#cdd8e0',
      dirt:'#a9b6c2',
      water:'#6f9ec4'
    },
    tint:{
      night:'rgba(18,30,64,.42)',
      dawn:'rgba(214,150,104,.14)',
      day:'rgba(0,0,0,0)',
      dusk:'rgba(80,66,116,.22)'
    }
  }
};
/*</data>*/

/* The growth row and the proportions a species draws with at a given stage,
   with its own overrides folded in. Every draw function starts here rather
   than reading STAGE and its TUNE table directly.

   Cached, because it is called once per bake and a bake happens for every
   frame of every animation — and dropped by artChanged(), like everything
   else the game has worked out in advance. */
const stageCache = new Map();
function artFor(spId, stage){
  const key = spId + '|' + stage;
  if (stageCache.has(key)) return stageCache.get(key);
  const st = Object.assign({}, STAGE[stage]);
  const tune = Object.assign({}, (SPECIES[spId] && SPECIES[spId].tune) || {});
  const adj = (SPECIES_STAGE[spId] || [])[stage] || {};
  for (const k in adj){
    if (k in st) st[k] = adj[k];
    else tune[k] = adj[k];
  }
  const out = { st, tune };
  stageCache.set(key, out);
  return out;
}

/* ---------------------------- drawing from PIX ----------------------------
   Three ways a stored sprite is used, and none of them wants the others'
   behaviour, so they are three functions rather than one with flags.
   -------------------------------------------------------------------------- */

/* Straight onto a context, at a scale, optionally in one flat colour. `flat`
   is what gives a food item the hard outline every animal in this game has:
   stamped four times a pixel out in each direction under the real thing. A
   bounding rectangle will not do it — that comes out as a black plaque. */
function pixDraw(g, id, x, y, s, flat){
  const p = PIX[id];
  if (!p) return;
  s = s || 1;
  const ox = (p.ox || 0), oy = (p.oy || 0);
  for (let r=0;r<p.rows.length;r++){
    const row = p.rows[r];
    for (let c=0;c<row.length;c++){
      const ch = row[c];
      if (ch === ' ') continue;
      g.fillStyle = flat || p.pal[PIX_CH.indexOf(ch)];
      g.fillRect(x + (c-ox)*s, y + (r-oy)*s, s, s);
    }
  }
}
const PIX_CH = '0123456789abcdefghijklmnopqrstuvwxyz';

/* Onto its own canvas, with a hard outline dilated around it. Icons and
   headgear both want this and both used to carry their own copy of the loop.
   Cached, because paintChrome runs about once a second and the shop redraws
   every frame it is open.

   The canvas is a pixel bigger than the sprite on every side. The outline is
   dilated *outward*, so a canvas cut to the sprite's exact size has nowhere to
   put it, and any art pixel touching the edge silently lost its outline on
   that side — eleven of the twenty-nine sprites did, and `icon.play`, which
   fills its box, had none at all on any side. A sprite is art, not a box: it
   should not have to keep a spare row clear to be drawn correctly.

   The pad is published on the canvas because headgear places itself from the
   canvas size and would otherwise ride a pixel high. */
const PIX_PAD = 1;
const pixCache = new Map();
/* `outline` is optional. A sprite that wants its own edges drawn in the pixel
   editor asks for none: the dilation pass is a convenience for art that was
   drawn without an edge, not a tax on art that has one. */
function pixCanvas(id, outline){
  const key = id + '|' + (outline || '');
  if (pixCache.has(key)) return pixCache.get(key);
  const p = PIX[id];
  if (!p) return makeCv(1,1);
  const w = p.w + PIX_PAD*2, h = p.h + PIX_PAD*2;
  const c = makeCv(w, h), g = readCtx(c);
  c.pad = PIX_PAD;
  pixDraw(g, id, (p.ox || 0) + PIX_PAD, (p.oy || 0) + PIX_PAD, 1);
  const d = g.getImageData(0,0,w,h), px = d.data, solid = new Uint8Array(w*h);
  for (let i=0;i<w*h;i++){ if (px[i*4+3] >= 118){ px[i*4+3] = 255; solid[i] = 1; } else px[i*4+3] = 0; }
  if (outline){
    const [orr, og, ob] = [1,3,5].map(i => parseInt(outline.slice(i,i+2), 16));
    for (let y=0;y<h;y++) for (let x=0;x<w;x++){
      const i = y*w+x; if (solid[i]) continue;
      if ((x>0&&solid[i-1])||(x<w-1&&solid[i+1])||(y>0&&solid[i-w])||(y<h-1&&solid[i+w])){
        px[i*4]=orr; px[i*4+1]=og; px[i*4+2]=ob; px[i*4+3]=255;
      }
    }
  }
  g.putImageData(d,0,0);
  pixCache.set(key, c);
  return c;
}
/* ------------------------------ boxed sprites -------------------------------
   Some sprites are drawn into a place that was laid out for them: a food item
   into a cell of the Feed menu, a shop row, a spot on the ground; a heart into a
   nine-pixel pip of the bond row. Those places were sized for the grid the art
   happened to be drawn on, and the art was drawn at a fixed scale, so drawing
   the fern again on a finer grid for more detail made it bigger — 14 x 23 cells
   came out twice the height of its cell and ran over the menu around it.

   A grid is resolution, not size. Each kind of boxed sprite has the box its
   callers were laid out for, as [w, h, ox, oy] in cells: the size and the origin
   of the sprites that were there when the layouts were made. Anything that fits
   is drawn exactly as it always was, by its own origin. Anything bigger is
   scaled down to fit that box at the caller's scale, centred in it — or, for the
   mess, standing on its foot, because the mess sits on the ground line — and
   drawn from a baked canvas with no smoothing, so it stays hard-edged. Sprites
   are never scaled up: a small sprite is small because it was drawn small. */
const PIX_BOX = {
  item:  { w:12, h:10, ox:2, oy:4 },
  heart: { w:8,  h:7,  ox:0, oy:1 },
  mess:  { w:10, h:9,  ox:4, oy:7, foot:true }
};
function pixBoxOf(id){ return id.slice(0, 5) === 'item.' ? PIX_BOX.item : PIX_BOX[id] || null; }

/* The sprite on its own canvas in one flat colour, for the outline stamps. */
function pixFlatCanvas(id, flat){
  if (!flat) return pixCanvas(id);
  const key = id + '|flat:' + flat;
  if (pixCache.has(key)) return pixCache.get(key);
  const p = PIX[id], c = makeCv(p.w + PIX_PAD*2, p.h + PIX_PAD*2);
  c.pad = PIX_PAD;
  pixDraw(readCtx(c), id, (p.ox || 0) + PIX_PAD, (p.oy || 0) + PIX_PAD, 1, flat);
  pixCache.set(key, c);
  return c;
}

/* Like pixDraw, and called the same way — (x, y) is where the box's origin
   goes — but a sprite bigger than its box is shrunk to fit it. */
function pixDrawBoxed(g, id, x, y, s, flat){
  const p = PIX[id], box = pixBoxOf(id);
  if (!p) return;
  s = s || 1;
  const fit = box ? Math.min(1, box.w / p.w, box.h / p.h) : 1;
  if (fit >= 1) return pixDraw(g, id, x, y, s, flat);
  const w = Math.max(1, Math.round(p.w * s * fit)), h = Math.max(1, Math.round(p.h * s * fit));
  const bx = x - box.ox * s, by = y - box.oy * s;
  const dx = Math.round(bx + (box.w * s - w) / 2);
  const dy = Math.round(box.foot ? by + box.h * s - h : by + (box.h * s - h) / 2);
  const was = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(pixFlatCanvas(id, flat), PIX_PAD, PIX_PAD, p.w, p.h, dx, dy, w, h);
  g.imageSmoothingEnabled = was;
}

/* The cells a sprite actually paints, { x0, y0, x1, y1 }, or null if none.
   A grid is drawn with whatever margin the artist left, and an origin is
   wherever it suits the game, so neither says where the picture is. */
function pixInk(id){
  const key = id + '|ink';
  if (pixCache.has(key)) return pixCache.get(key);
  const p = PIX[id];
  let ink = null;
  if (p) p.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === ' ' || x >= p.w || y >= p.h) return;
    if (!ink) ink = { x0: x, y0: y, x1: x, y1: y };
    else { ink.x0 = Math.min(ink.x0, x); ink.x1 = Math.max(ink.x1, x); ink.y0 = Math.min(ink.y0, y); ink.y1 = Math.max(ink.y1, y); }
  }));
  pixCache.set(key, ink);
  return ink;
}

/* A picture for a cell: the painted part of the sprite, as big as fits in
   maxW x maxH up to `cap` times, centred on (cx, cy). Scales of one and up are
   whole numbers, so every cell is the same size on screen; below one it
   shrinks by what it has to. The margin and the origin are both ignored — the
   Feed menu placed items by their origin, as if every one were a 12 x 10 grid
   with its origin at 2,4, which put a fish with its origin at 0,2 and a fern on
   a 14 x 23 grid well off the middle of their cells. */
function pixDrawFit(g, id, cx, cy, maxW, maxH, cap){
  const ink = pixInk(id);
  if (!ink) return;
  const iw = ink.x1 - ink.x0 + 1, ih = ink.y1 - ink.y0 + 1;
  let k = Math.min(maxW / iw, maxH / ih, cap || Infinity);
  if (k >= 1) k = Math.floor(k);
  const w = Math.max(1, Math.round(iw * k)), h = Math.max(1, Math.round(ih * k));
  const was = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  g.drawImage(pixCanvas(id), PIX_PAD + ink.x0, PIX_PAD + ink.y0, iw, ih,
              Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  g.imageSmoothingEnabled = was;
}

/* Anything the editor changes has to drop the caches, or the game goes on
   showing what it baked before the edit. */
function pixInvalidate(){ pixCache.clear(); if (typeof HATS === 'object') for (const k in HATS) delete HATS[k]; }

/* Everything the game has baked, dropped in one call. The editor changes a
   number and then has to make the game forget several independent caches — the
   frame cache, the material cache, the pixel cache, the backdrop cache and the
   sky. Forgetting one of them is how an editor ends up showing the old
   sprite on a new palette, so there is one function and it clears them all.
   It is called at runtime, so the caches defined in later modules are there. */
function artChanged(){
  pixInvalidate();
  if (typeof paintCase === 'function') paintCase();   // the case is a sprite too
  if (typeof frameCache !== 'undefined') frameCache.clear();
  if (typeof matCache   !== 'undefined') matCache.clear();
  if (typeof warmQueue  !== 'undefined') warmQueue.length = 0;
  if (typeof bgCache    !== 'undefined') bgCache.clear();
  if (typeof skyCache   !== 'undefined') skyCache.clear();
  if (typeof skyViewCache !== 'undefined') skyViewCache.clear();
  if (typeof thumbCache !== 'undefined') thumbCache.clear();
  stageCache.clear();
}
