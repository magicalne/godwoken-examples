import { initConfig } from "../account/common";
import { privateKeyToCkbAddress } from "../modules/utils";

export class Account {
  constructor() {
  }

  /**
   * get CKB Balance
   */
  public getCkbBalance() {
    // TODO:
  }
}

export const privKeys = [
  // https://explorer.nervos.org/aggron/address/ckt1qyqf22qfzaer95xm5d2m5km0f6k288x9warqnhsf4m
  "0x6cd5e7be2f6504aa5ae7c0c04178d8f47b7cfc63b71d95d9e6282f5b090431bf",
  // https://explorer.nervos.org/aggron/address/ckt1qyqd3xwv870m7pq2afqng65s4fjaavmcnlrqrhak5w
  "0xf5e9bac200a2eca0b0eead8a327ef3dc148ba10e192d07badad2d195f2488b94",
  // https://explorer.nervos.org/aggron/address/ckt1qyqrcfkkj0tt2ddv56z5s60rgkjqnsjkcggs2hnge8
  "0x01e3b36f5876291a6ee7b573329b33706a67be0dabcb0d91387684770ff7bb44",
  // https://explorer.nervos.org/aggron/address/ckt1qyqy84gfm9ljvqr69p0njfqullx5zy2hr9kq0pd3n5
  "0xdd50cac37ec6dd12539a968c1a2cbedda75bd8724f7bcad486548eaabb87fc8b",
  // https://explorer.nervos.org/aggron/address/ckt1qyqpz9hkp896fml9gulxfsn0cdvswx82m3ws0eywhe
  "0xd9066ff9f753a1898709b568119055660a77d9aae4d7a4ad677b8fb3d2a571e5",

  // https://explorer.nervos.org/aggron/address/ckt1qyqr5jd078v0euv3fjjptj7wjmlsh8lpkr8sqmxnea
  "0x1390c30e5d5867ee7246619173b5922d3b04009cab9e9d91e14506231281a997",
  // https://explorer.nervos.org/aggron/address/ckt1qyqvpyztgdlggsnd9l0d5juvky2des89ecfq7kxn86
  "0x2dc6374a2238e414e51874f514b0fa871f8ce0eb1e7ecaa0aed229312ffc91b0",
  // https://explorer.nervos.org/aggron/address/ckt1qyqwyk39th3jnqhf4wrnlxxse4yf944kqwls6ps0da
  "0x15f0805f5ebabda961cca1e97cdae03919b07d3eee4a9074c075ee2e80f2da9f",
  // https://explorer.nervos.org/aggron/address/ckt1qyqpjc645x2j8565e2ptjdyc55v29e6vlt0sl55grq
  "0xa786cd647b24acbdc8ca46757dff3a930744179b6e20d9d8813c9430f954bd73",
  // https://explorer.nervos.org/aggron/address/ckt1qyq8ysrledg6dd7z2ymvsh6869l5xcwdunyssx3kg9
  "0x21c3849c1d6d150f50806e773458df00c4501118e38f777b4110d50f38d91bfd",
  // https://explorer.nervos.org/aggron/address/ckt1qyqzw6ltsr69pnalq0fvdmsqrgrj6txp4pcstz7nk5
  "0x1bd5d82ce33bfeb5824a919127f3f95c50314c1ca72c1fb7c370f3c79ecbe8e6",
  // https://explorer.nervos.org/aggron/address/ckt1qyqp7ece5ujgjf9a6e0h3xafhht6zt6tpqeqyz0y7f
  "0xacc5997a76ee194e4406b5e4e020efd6ca53dc3276c3d43753d55e936335c25d",
  // https://explorer.nervos.org/aggron/address/ckt1qyq86rkjhn5saavpy53slpfy9m7qzv35mclq8qn2jg
  "0xe2b0be6ffdba34a9d1e906f3a83ad24440ea22673b709306b1bc3b51030f79f3",
  // https://explorer.nervos.org/aggron/address/ckt1qyqg49m3qh6mks7an4vpfxmcz3m8cp7kdasqvf7swv
  "0x65d50620ad7f08ef4da10e9992062626daddc3b68907012ece845e9bbc8c14ff",
  // https://explorer.nervos.org/aggron/address/ckt1qyqdk496m2fgaxura9fdhf9va3t7nacyjcusqjrzn2
  "0xd1017ca5b9f0242818a33acd18911caadab84c8c92331eb2ecd2b44895e1d099",
  // https://explorer.nervos.org/aggron/address/ckt1qyqv9afd6sgg6zrtl2vuvpeym2t3ehgt9gzsqh9rp9
  "0x991494a67bcfa4c30807f5a1426eaad2b79845672913c259da16926711328ae9",
  // https://explorer.nervos.org/aggron/address/ckt1qyqqhgjx0qa3nqs96zhehk979r3wywjsp4hs2cwd5h
  "0x7f52aecd6e71e2ca3c6dd4b2b82212767598006aee0718f140a8bd0647d2832c",
  // https://explorer.nervos.org/aggron/address/ckt1qyqvl4n3dujpews0w9e7gj08zckjxk8xessqmkhp9m
  "0x3826f69f59026faca8aa97f40cd512597b8801ebc40a88db19216d1742fdf4e7",
  // https://explorer.nervos.org/aggron/address/ckt1qyq8m8vwfe4md75hz6yl3a498fcl7x70pxgqdf2ms7
  "0x6edf8a51e2abb4543cacaa57aee366c95d25c8cffe4b41b0a7431d902c81080b",
  // https://explorer.nervos.org/aggron/address/ckt1qyqyc3acg5xf4cqjmekntftzm3k8vy7n3uls437h4c
  "0xdc181bbbc3d89ffad393e556949b56e2b44d2d4050d931262b559ef08e5eaf41",
  // https://explorer.nervos.org/aggron/address/ckt1qyq04l22jus670ynvcght6cn5ujqe9nygmcslrv3cu
  "0xb9a9aafa95299e1d149aca1f002e20a697846889c6540cd37a99193cdc3e742a",
  // https://explorer.nervos.org/aggron/address/ckt1qyqdr28xv8mwhfg2zmqa5qvefr3ld6zyaa2sgphu8p
  "0x2adc9f91e9686c0838c990e0ad9893ba32fdffa33341eb295cef3b1b0027d8c8",
  // https://explorer.nervos.org/aggron/address/ckt1qyq0fl2epvja3yp66u8xj0rjzr392sx52s5sr26ffj
  "0xf59c5e9cfe8ed57a4cda42046fa78fdb016002a651eae27bad65b4ade81dad51",
  // https://explorer.nervos.org/aggron/address/ckt1qyq9xyynh9fcctmtkpfmmenj57v5f2gez8tqvtt73z
  "0x68777010f63b24b117f7bb28848b9c841d341b3f02b632ae2f6cdf59c6cd575e",
  // https://explorer.nervos.org/aggron/address/ckt1qyqv87xf6hauqrk20hq2uh9ws2lnl0a5c03s7qe5t9
  "0xd5ffdf1c0c22c29ac05e7fd15113c47d23c59e671032a4a91f88e989c45aa9a5",
  // https://explorer.nervos.org/aggron/address/ckt1qyqwdjzcydj5xacut7hxkunx97lk3h2txfhqjpc8t4
  "0x423bcbaf313bba759f32860277338eceebfae3fd1f424c9920d0e396f6d08139",
  // https://explorer.nervos.org/aggron/address/ckt1qyqg4r47rk46nlh4mhl4h7q8peyaw42kl84q2cdykq
  "0x4f05777a56806bda4d6869ceb05ba77992a818839b04131d04cded4f7a545c70",
  // https://explorer.nervos.org/aggron/address/ckt1qyq8wllm5kxxrluzac4ppl7s7w2ermsn76cshlwnlg
  "0x63a83772e6e06289355fc49179a3b9af7c74a43c679d28430caf31fe6a329cc4",
  // https://explorer.nervos.org/aggron/address/ckt1qyq0wnejc9rpj4vqf2qvx880ekzq2d8sxawqk7reqs
  "0xf9eba38eacf61f3d19a75c3777ddac5fe5e6d6a88ebba84b2cff83a33bbe336d",
  // https://explorer.nervos.org/aggron/address/ckt1qyqy9858p0klgh7c5s0h2q4xfwnxx8ahx5gqxkymwk
  "0x6ce28df6f9d6133c84a5eb61585fe7b4a9290cbdcc7ae8aa4552743220e1ffc4",
  // https://explorer.nervos.org/aggron/address/ckt1qyqtstccnzjnavargr8fx5vytyyscwyjc07q32tlpl
  "0x83eadd19be6bcc45491b2cfa9b8165a8c3a88db6b9aa3e21c71da3a8a4297122",
  // https://explorer.nervos.org/aggron/address/ckt1qyqw3lt8nug4m5wl9ef2emnway3csxy2c5lsfwhsq8
  "0x44d53f416499786cf9c97c5785420672c1bfe83f5813c3120a9da5bb82eea4e6",
  // https://explorer.nervos.org/aggron/address/ckt1qyq0x70yqeeajg2mjk40msflj30ly3gwn79slr4phw
  "0x36137042101a97767c1b10ce6116e9e281867180628df6477ce0d16ad086a05e",
  // https://explorer.nervos.org/aggron/address/ckt1qyqtfjgejmm2wf62edhvtu6eqs0m2wms08ts2tch79
  "0xf44ee8a762e57f11cc016a84ef310a99570a0034ce9cd362dcf998ba6e9f3322",
  // https://explorer.nervos.org/aggron/address/ckt1qyqw5w9h0l5reuqt0d6mw2lmmlkrfw50673sgzff95
  "0x80993eea293b3403b5ba1fbf5b2ee5a16415af1fce92de838b48c065a5f21480",
  // https://explorer.nervos.org/aggron/address/ckt1qyqpr828nn08v8tsupv0ra4tpfthzgx8f48qqeulcw
  "0xf2d474fbf5ba475051974981c8d47af2c882b44b134608bd36397c57ea944797",
  // https://explorer.nervos.org/aggron/address/ckt1qyqpfwu0d9mq80kuuxwf9qavewhdmxwdqx2spsc7a8
  "0xb4d053c3e22ac36792504bff325dc225ba15f9c7dace139710008d41b526fb7f",
  // https://explorer.nervos.org/aggron/address/ckt1qyqp7sl5qhpqwqjdr3meksrkufzkhtd5t6hslml2xp
  "0xc27a8b82c7ea9b39ba736cd5e22e7a0b0fc82a5e67cbda8c2187a847d3c8a364",
  // https://explorer.nervos.org/aggron/address/ckt1qyqtmeserp0pjr5mk8ku3ceu4frzlmqanmus5ehurq
  "0xc6622bf4ff5ecce0e8c57742a9ea596226a4c9f78ff516e3797c9bc6c6b95e29",
  // https://explorer.nervos.org/aggron/address/ckt1qyqqpjq3fr84uavknxhw8w5pdjsd44n375xsgqn0t0
  "0x72a37607ce365b953382c1ea05ea0712e9b88fd3d77a72e8468f7994d46eac02",
  // https://explorer.nervos.org/aggron/address/ckt1qyqt3lvxnjtg6qrmm0h9hl6yazta8yuefwms0595qr
  "0x79487e2a3785d94fe6f24f3541ac41f8ae8d5710bd14bd78394dfd135225d79b",
  // https://explorer.nervos.org/aggron/address/ckt1qyqtkddwtyf6xtnl4ru3uz7l2zvyj7ytw44s2ad5zg
  "0x2b296d33e656a6c9367f94301c6781a1401ce20d8cb02722bff676617ffb8dac",
  // https://explorer.nervos.org/aggron/address/ckt1qyq9y9fn7mlahdklqy9ut5r7lfhze9fqkldqgn2yv8
  "0xf08f514aa63d99c2aca190b8eaa181cd6783f2b7b229fc7cacb4ca2c4438f5e5",
  // https://explorer.nervos.org/aggron/address/ckt1qyqgm89sgpuc55yf400jelg7ep6g82rs6kvqt7qzrc
  "0x459dbf4bed9a5698901fcdbb385afb6ead57efa28ca214d96552688e7b7d6a90",
  // https://explorer.nervos.org/aggron/address/ckt1qyqffg7jp00kr5uv852anfjhtmfaxr07z2ms22e33h
  "0x493f323254166759df26aeb7d9c09b580d87cf12339cb45c1a6c9405e223a805",
  // https://explorer.nervos.org/aggron/address/ckt1qyqy67ty60mn5cdt38w93nu407tynwt635msxk5xtz
  "0xb66d31cb8d1490f9517e7471be480857d8d5b0b8a6e667a02ffa792e82928daf",
  // https://explorer.nervos.org/aggron/address/ckt1qyqtsaa5awqh8gw6qp2tr8md68hq3qegwhlqtx3nnp
  "0xbd76398458cde6292427ec0db469b3a5860bd8685b3fa96c0b7b59c7dbc1e57e",
  // https://explorer.nervos.org/aggron/address/ckt1qyq97g833fferm20avdag8ev34uj5f8n408s24h3vs
  "0xb027d7c1091c54b3d473ad1f4261814e4619e3de8de47d07c85d84f1b68907ed",
  // https://explorer.nervos.org/aggron/address/ckt1qyqflyw5x5d6h2d6lxw48neqea3srl7jhtcsrfe5gx
  "0xb77f3f3edc8152dbc4df1ac3925c31fc309973404d0218d2da168aaa1c6d0073",
  // https://explorer.nervos.org/aggron/address/ckt1qyq87glt8rqkqgrlxqnmz70g9jl0wtqhfw7sr2cazq
  "0x3d4e207533110f034cb90472637cffc6037312a859978c499ff8ae055d273845",
  // https://explorer.nervos.org/aggron/address/ckt1qyqq0g29mg5lx8tcdwke7wr48yt44sc8nhqq5zmgde
  "0xcf144a989c711b28d0ec0c735ca3092acf03df3b58bc718698ecd836b57c5968",
  // https://explorer.nervos.org/aggron/address/ckt1qyq8slkqddr3zlgn49y9njtjzjqn0esmn94qkql96h
  "0xe515a1f6c356ecc1702524ad567df9c020e4c02f16c870fcaa8334bc1f7f56e5",
  // https://explorer.nervos.org/aggron/address/ckt1qyqy5ngdep9pwvrpg2cx3y4k3hrapf69sr7qjlxmgk
  "0x418286b7021fb191b15e9d963fb83d55e7f24e796bee2e2eff340c6b135c1be9",
  // https://explorer.nervos.org/aggron/address/ckt1qyqyzwxj35ka5mfwdqeq85z06amj9f7aaresc68wdp
  "0xb8b52a5c6d79b7af3cdd44eaba34821f27f5b08ef7d8296757bcf68c97f6761c",
  // https://explorer.nervos.org/aggron/address/ckt1qyqytf6kedsdcmyhwzx2fwpqamrp6p8vag3qtupktx
  "0x4d2f0c443e26798b88547af021265ef16f51f8a709c71512797256def49cfc88",
  // https://explorer.nervos.org/aggron/address/ckt1qyqy68x7sx4p6raesg3dd3dq34c96jt7kk0smc2agx
  "0x406cefdac85d440a4b289051fb899d2501669eceb798022d90a3d6e7debd0e67",
  // https://explorer.nervos.org/aggron/address/ckt1qyqflym3h9xtkepe207n85570t0wf4vvctgszt3tcs
  "0x48ea4a2d7d375e0e796b4fdc58c83f513d6e654a4cc1d7c47eb6ab6f7495788a",
  // https://explorer.nervos.org/aggron/address/ckt1qyqfpwjjruw7tx2vs0eum6gqlnt4gau6yl8s5gcanx
  "0x1fbbb89185b44ee6293d0e6a69d705c0cbc1a31515f3c310f003e320c67a6f8f",
  // https://explorer.nervos.org/aggron/address/ckt1qyqxwwqk3eln2yvlq8nr6z0uwplxj474yweqnche5z
  "0x84388dca5161014f5af2cb1548e12d0b3cd440ba9ddbc741445b5505aeee7faa",
  // https://explorer.nervos.org/aggron/address/ckt1qyqdk4leldxuhherglhe8kseutxv8cwm2lnqpf8laz
  "0xae30fa0b1eb0910ba3b446b6cb1aa6a0dc3842404cfa57556b50da6f21b28581",
  // https://explorer.nervos.org/aggron/address/ckt1qyqw4ngmqfw98qsmr6je56ycvd5zs2wjx78qlyqgvp
  "0x8ce913701ddf7da2b97a9241eceac1d4610effc93b416dfaf8021784a5440257",
  // https://explorer.nervos.org/aggron/address/ckt1qyqvc6az8x25pchhy5a5dc5q402wgyr5775qzdpt9v
  "0x4eb74d85f7af7bad824e8cd281ad51d934997f82fde184ee8540c53d845eee2a",
  // https://explorer.nervos.org/aggron/address/ckt1qyqdghcvferfgf8ucsha8sne970y8hpcznjs524sla
  "0xd97c287fb441f6b1235494535fcd876f362a6b956fe8e7d56866842f0906fc59",
  // https://explorer.nervos.org/aggron/address/ckt1qyq8zlakxtstxle28tpkel90l648449afruqa6aza3
  "0x9b97552a1745e43d890655c615a1c41242485351c8242708890ec6ab72c18404",
  // https://explorer.nervos.org/aggron/address/ckt1qyqv4lsuw0ldp8wh6ypy855jjqjqs8v2zges54am88
  "0x60d9b26c641569911a95bb18521ba148b6ac64025e4a11dd0c0649392fbc1c10",

  // 100 accounts
  // https://explorer.nervos.org/aggron/address/ckt1qyq2k222ugqdqy9t5f8cdkfhn75frjq64csqry0a30
  "0x80293562ef91396ae6f0b9895655875010fc3fc19f2bc984718d895f44385e20",
  // https://explorer.nervos.org/aggron/address/ckt1qyq9mgfeawpy8wc6wqq6sfty2ywfdrp87mcqj7jns2
  "0x2fc6818c09fb208bfc5b3a7a0e83929befdcb67591b1b17770a6821b9305e292",
  // https://explorer.nervos.org/aggron/address/ckt1qyqy0fr6z3a64j0xnyw24elcj9c9gchxun8s0kxh9g
  "0x5c1efdd9fc6a787e9ae75b24588b038576aa0cb761992631dc53f7c552707f4f",
  // https://explorer.nervos.org/aggron/address/ckt1qyq02zfecam079zczvsqgg5twuwjyj9ghplq3sfxyk
  "0x1494fa8855397729927fbeb99ccdc660b852cbacd2e854cad127aaced47f89bd",
  // https://explorer.nervos.org/aggron/address/ckt1qyqpyqz9ynfserl0w8pt2d2zf4u08c7llf9seuvycs
  "0xb51791e7f17d1084ce85ca1dd35796a2ccd3df972342cc8ce61be0c37bca7a79",
  // https://explorer.nervos.org/aggron/address/ckt1qyqt7e4p42lyymuw48405mc77t8cask25egs77x73y
  "0x6fbc2c4364e8989b6f72166d460947bd224d943e3762197025b052ff442e124d",
  // https://explorer.nervos.org/aggron/address/ckt1qyqqamehyrd468y0x8nmfzkavu2xprhwhpxslx35n9
  "0x99e42b06ef489854595cf3edd56a6a9629576d9be5cdfa25699d4586262d4968",
  // https://explorer.nervos.org/aggron/address/ckt1qyqdmq3sye3amk2vnfcfffs4k336s54qr9uqw4nesj
  "0x57ba6c9d6d905cbde38350755a5781d59a8d55d58db60d7b5c818038ea626e8f",
  // https://explorer.nervos.org/aggron/address/ckt1qyqzt6al65g3lf7wrtkes3un2ga5u2xsajeqppms87
  "0x8eed231927c24fb8993182506eeb4c240a943bcb67b0d49c8ae7b4116858860d",
  // https://explorer.nervos.org/aggron/address/ckt1qyqd3s0kfwy45qctdyelvddjxcaeexzu4zns5tkvtq
  "0xcba53146f3ae3f9b905f0e07c75d501caab1c9b45c0d5cbd6af4881689698e7f",
  // https://explorer.nervos.org/aggron/address/ckt1qyqqsdtasrcaett59kwn7zlexza3uxhencqsy9lzy8
  "0x8f1ca9c74bd47ca6d26a78e9cb43113a196a77d535f094237f2c25759f3d9a5f",
  // https://explorer.nervos.org/aggron/address/ckt1qyqd28wlrpshjl5x4yx6q25m92lhudpze6kscqxj7g
  "0x04443773b7b6e8670b965550c81bb40271da345f299b3f86410a85efde0d1552",
  // https://explorer.nervos.org/aggron/address/ckt1qyqzm8qh6yjkadm6cy8z6t6nk6sp6ge62f7q23qeam
  "0x66ce17795c3d84f10274788a503d938e11a080b313da70b2a0dd4982a58a60c2",
  // https://explorer.nervos.org/aggron/address/ckt1qyqfrw38zkpzppn0uxelujaq9tj0cxy7djdqyhh54v
  "0xf5b0776697a764b8fc0098742dc31abac98d6c0e373defc91ece342a47523bf6",
  // https://explorer.nervos.org/aggron/address/ckt1qyqys55y2q6f0pstdaqfzswazaqw49jk053qh7lnxh
  "0xa8ef70707c89810c8a80b79c4d96b6f871a802dd4b7746a6fb81b79abe06f804",
  // https://explorer.nervos.org/aggron/address/ckt1qyqxvfacz0ay83cgne8czx73l5eswyskmxcs4gsxsx
  "0x09d825ce9e5d6979c77105543800c9a2d46c4f799e8fad18c74c412ef4134904",
  // https://explorer.nervos.org/aggron/address/ckt1qyqpz93tlrtd9u45sz609ettmxgluastk5wsglhgj6
  "0x2c1fc51f6e2a84cb2c0677e962678fb1320a450b109e3306a7cc9528588c14bc",
  // https://explorer.nervos.org/aggron/address/ckt1qyqzrmptcfa8rn2x3j3udcxq4x45xvx86p0qkjx6mf
  "0xc6798387cbc543c925531fc8b245f6740b9c80d1e6d28b87fea4cae89b20bfc7",
  // https://explorer.nervos.org/aggron/address/ckt1qyq0g7xmmv2qa9363363a70j8qw04nq3z9yqyh5p6h
  "0x22ce7311fbf0739384abe2d95946079d03f90ff8a9ed4e29c56260ef80e5be62",
  // https://explorer.nervos.org/aggron/address/ckt1qyqwhtey0wj4ntranrh2mp547mvdl5nwvhqsnqlzjz
  "0x9697031251b2da458bd10d7de80af7b374bcc5020d5f4d45dbc81e875e3aaf3c",
  // https://explorer.nervos.org/aggron/address/ckt1qyq2h9nrcfhvleyqqtfrtdgkcf7nnzyluzksesjw8h
  "0xd667b9d097fe8d0c8a31bf820bfcf882735fa81f53563e62005b0f378c32aa62",
  // https://explorer.nervos.org/aggron/address/ckt1qyq93uucuvj7pt4hr3hgm9frmeqmnsnla22qcsyjxd
  "0x2cefa1b404c44f7bd7484c3965178a69973e17676f3f803d0a429ad84e42d749",
  // https://explorer.nervos.org/aggron/address/ckt1qyq00mlmzzemqsdjpvuhc67c52l936kqhexqds34df
  "0xbe1722ca3b7d0f5ef9c01f532b3b8dfc6ef95ee3782cc0469a3dec159d13093d",
  // https://explorer.nervos.org/aggron/address/ckt1qyq05zpdwrhpszkkgpq6wqlahw2r6ccepc0q06qdlf
  "0x72bd225873360c2507381badee4f51042e542bb58898a8a637adbeb110887c54",
  // https://explorer.nervos.org/aggron/address/ckt1qyqrm7rh0wpl7xyzk8pllsq8u6ctemvk5wjqu5686c
  "0x64e3fd104e94f2b61ccf170541dc29ff8ea004e08857f738768d57efcbbc818b",
  // https://explorer.nervos.org/aggron/address/ckt1qyq2jz9adx7tvjz6k60y3vgw4wtg4c7dykasw40rkj
  "0xa40be27284222ab96533f725b065bb92d8d098fb42b2816066ae38db199797d4",
  // https://explorer.nervos.org/aggron/address/ckt1qyqyvej0d3uu3y4r2wax8en46vq5fpk23kkqnc9xkq
  "0x00b0053bfa1d9a89931ecff7964517970bc44b4ba8cf9a8111c6cc051858d1f8",
  // https://explorer.nervos.org/aggron/address/ckt1qyq26gz52twwzc2nqecglvlwzrewvkz2xy3qxtxp3e
  "0xcd057b5d4ec20396986ee871aa6450008b3a85d06d7643096edc6a4dd40be031",
  // https://explorer.nervos.org/aggron/address/ckt1qyq0sgcv24d7w4krwhcfnl6asdvu8nkup2qs69yrdj
  "0xb1e9c68c158db0fd144c091c6bc5b63b530072100c125c611a0c0da957adcc28",
  // https://explorer.nervos.org/aggron/address/ckt1qyq0jl77dwhj5ryf360p9qljlphnul77kqnseknlag
  "0xed866c58e07575d968b140192f6ad8c00688e0a8234c3ec68aa3a1f082eeb8ce",
  // https://explorer.nervos.org/aggron/address/ckt1qyqpe7wkwrhphcj094gnk3yyvaxzgpfgcw2qk5ekq6
  "0xe3378fdb736fa4b270615b090dd1d02b54c84c7535e164bf912494803542ccf4",
  // https://explorer.nervos.org/aggron/address/ckt1qyqqtnw29fauk6vrddnazs4e8t24ftzcmwvsf6kg4q
  "0xa5c7d5f6b4b8bde6bbdacdf5097f05e05b149fcbd7262c361a49fa7c2fe0c17a",
  // https://explorer.nervos.org/aggron/address/ckt1qyqql2695hvkmhnj9uchwejezju5cm4j4qgq0dn4rm
  "0xcc8d078d70a2d260b5d60435d12bd2df470147dc2167022f584cfaf0118dc6c9",
  // https://explorer.nervos.org/aggron/address/ckt1qyq2hwkmh2szxpa4ptv3vskhsr3gd0z9gs6qt6t60k
  "0x26cc18dd57010a24422f0ac01b899a3cef34235b0fe854c1ada34ffd9cd45217",
  // https://explorer.nervos.org/aggron/address/ckt1qyqt4wt5uqq9rh337pt80yeecye3xna3g9rqqqqrx6
  "0x7340ac817309e42895f71c566f0d34d7dfafd5a77807056f33d6d805d1740e13",
  // https://explorer.nervos.org/aggron/address/ckt1qyqddpn3wzgacq690r4eu798c40w06nmfspsrdys3d
  "0x33ead9ed8e4e3664d6f68264daa17545253232c97aa99a85e536e492ed4ee9b1",
  // https://explorer.nervos.org/aggron/address/ckt1qyqx6jf3dp3z0uky0tw060n9rfpekl9dl3qqyg367p
  "0xf681a6cc5da113a2c0903bacd54b058f4b02918935bfa45cbfe1fa044e65bf78",
  // https://explorer.nervos.org/aggron/address/ckt1qyqfkdedwfnjytket0yrvknv07pl46jdxwdsl23f6e
  "0x3bd16a7613298ce9ffc31a449431a95dfbba169d3dcbbb91eb9e5cf3f05e8dfe",
  // https://explorer.nervos.org/aggron/address/ckt1qyq93jqr7avy2c723qykd6mjjd3q2nt32pksrg2fkv
  "0x2b26b3002ae6f5eae581011b85fa44eb917b09b6e15e5ed26c0940e0f1ed1514",
  // https://explorer.nervos.org/aggron/address/ckt1qyqxx8mavs4tcau9eng02mqg43g7f7s2h3lq7aunw4
  "0xec245371f8445f3f6bb25d413a3620d43850e14f70cf452b817b018205a004f0",
  // https://explorer.nervos.org/aggron/address/ckt1qyqwy349pgn896m7sx7lptvwpmvk3sg29thqrpcrd7
  "0xa4c8aeb978e0ff9818cd73d9fdab409a2d39de075828d113e6fa17751d53afa7",
  // https://explorer.nervos.org/aggron/address/ckt1qyqz3tcq3t4a2td40smz9p6u2r52gv0zdjcstf9uc9
  "0xfb535e53afaaa1ac10513f41cdcb9eae555218f2661f1ef3b6cd6bb6614435bb",
  // https://explorer.nervos.org/aggron/address/ckt1qyqt6cc08gtjjewsrh6nxfwh6jc693mmyhqsljnee8
  "0xe327b03c9f55d02d53b77c9c618d1eb342c4ad8ae9ac7422d7c454f4ee6567fb",
  // https://explorer.nervos.org/aggron/address/ckt1qyqrv2pycq7ytq5mvtnzhjcr0yusmuwqv9xs2a6tzs
  "0x11e5ffc88b340a95c718e334bba4b93f88e7c24eec8c2ffa6abc53bc5867354c",
  // https://explorer.nervos.org/aggron/address/ckt1qyq05egmcfxp9ftnevft4685s72hktdf3u5sc43vtu
  "0xf4339c6d900cccc1de10702d1ec35c7d325461101cc931eea80ed288eaa3d630",
  // https://explorer.nervos.org/aggron/address/ckt1qyqphp4ms0cg3e6eu4j86ue2tnqt4kv4rgeqggwld5
  "0x3f6a2aad0271a59253ededaff5c76af6ae971cef6da1d0565657389f24b65ff6",
  // https://explorer.nervos.org/aggron/address/ckt1qyqx03ntxuumg8rxtuets5eppxfvrkjn2xjs8gzmz2
  "0x70c5c5c8031bf304318d0679df31529dd18f9c1690f7c351e87f0c87cff97840",
  // https://explorer.nervos.org/aggron/address/ckt1qyqzvvrte2unvhqtag78jr460kfztv2qypgqptyfde
  "0x3187d9922d59d2f21a3687d31b622ab33f8162acd4886442a378bddd274230d4",
  // https://explorer.nervos.org/aggron/address/ckt1qyq007ks68kn60ucjvge9845gj0vq5ueaams5glfkt
  "0xb8bcdbdaf16938053fa5117a674289b74ba0f2fcf61b7276463cb40b51263863",
  // https://explorer.nervos.org/aggron/address/ckt1qyqwza4cq2ykpds0at0kkfrkxzh2umgf7pjsul7xgg
  "0x126053ac10a0364012850b084281e6493db78c1614294cb628ea8b7af64bb6bb",
  // https://explorer.nervos.org/aggron/address/ckt1qyqv3la8rg39kqa7zlehx0nu5sx32rrvpe7s9e7zqg
  "0x5bdd4aaf92d6dc7fc5f599b50f51d6fee9e00bf627a670b173fa2ac3540e1d06",
  // https://explorer.nervos.org/aggron/address/ckt1qyqxflsqy3hsgd4njguhal76v6suh6vjuxmqm5xeyr
  "0x7bdc25cc1632aa668ebf0d0ed95da1877fc3963d52a8b58e734448c53d93ca18",
  // https://explorer.nervos.org/aggron/address/ckt1qyqp9qkf8szmlvdtuvyntt69cgtgusc2t9sq9q9dny
  "0x63c14b1c5e05916d36033547a4ed0e033f922e1911eaa6eb1918a7816cde966d",
  // https://explorer.nervos.org/aggron/address/ckt1qyq02u9a4drq75jmjg78p8p50342v9358jfs0e8639
  "0xe18f30148960e5fadb242d90d11ee6dc38af35d418794854638ce1be1b22e7dd",
  // https://explorer.nervos.org/aggron/address/ckt1qyqp5k8xnrh3z78zsg06pxnmmhf9dpxxkmxq9l0ucm
  "0x583d82dc2f0440fc3e74343894db0897ebe23cbecfd6501db381e5bd5ada13d2",
  // https://explorer.nervos.org/aggron/address/ckt1qyqqucvvaxtu4f6lqt0trqr9jnwprgxj87uqgn7lhl
  "0xbd8b6db33d7386abf10a75eed73fe0baf2c4865e42e5cdd3c420e692365fb060",
  // https://explorer.nervos.org/aggron/address/ckt1qyqt3au43snw4qh9hn0m5leqlehmlgdnyars0nmpav
  "0x2a8581ac446c8cb644feae5fec837b94bedf63cec5df2e490fef079ddc5c8554",
  // https://explorer.nervos.org/aggron/address/ckt1qyq9r83r847avve83vpvsflwhxjast9tk06qkhjdrw
  "0x4c12a936548e7062bbaa6f7dff1cba22d3ab69fa43790e5843b056dacbb5775c",
  // https://explorer.nervos.org/aggron/address/ckt1qyqtrt4lc4kh49cj7dkzcsvj95qttyxg8a5qgmsuyh
  "0x705edc0d1cd83015e530384ad35ed645f0782c5030e1c7636a19e9e4ab1d1992",
  // https://explorer.nervos.org/aggron/address/ckt1qyqddvajf7jprds7pp8z3lgnt0t257w6x6gq9x8qp6
  "0xb2623c232488a796f49e7c8137b308b13d8108aeb760be4c61d1e7c3449c888c",
  // https://explorer.nervos.org/aggron/address/ckt1qyqqe58ylwthf9x496cm3ka7qs87a53eahhsmqq43j
  "0xe8ee683fdee9e2276fb329c42a311ef8a4044017994ed12cb13e7710be739358",
  // https://explorer.nervos.org/aggron/address/ckt1qyqz7yukff8dq7zh6rckh653uvegfzlpgdusyw4fen
  "0x50384d9244f0f3c0ab4fc2df567cdd255b4e4a8e5a06bb7956de73b26fbbbc90",
  // https://explorer.nervos.org/aggron/address/ckt1qyqxsdlnfnz72py86wfesev63mnn0p6fxygse2mzdq
  "0xd488faf1c33b42f1d787dd5df71e84b427b2ce7322e6f060d1360515ba0a6a39",
  // https://explorer.nervos.org/aggron/address/ckt1qyqtkdxel69vsj7k26zj8l0afsp49thuna6q3g7dlk
  "0xdfa867dfa0243e8cce2a96a416b19854b8a006fe649bd3becb782ce7ec09b46e",
  // https://explorer.nervos.org/aggron/address/ckt1qyqftujnewzwvz2wjp6u59zzjhxjsvt550eqsdn4ez
  "0x380afa9995bd48904a6dd7bbeba653ffc5a1a2824cf8fa1d6635352ec2f5da08",
  // https://explorer.nervos.org/aggron/address/ckt1qyqdr58zuzlvx3h35q7utvqt0x0ruhljlxps9x38j2
  "0x36f9e7f272997ee707740f77df64e483e0285f589beb6d7034b388e8f0b66072",
  // https://explorer.nervos.org/aggron/address/ckt1qyqvwc9467rl9fls83fm85q9hgjfxm9xwfjsruxcal
  "0x19676d62be19df2c49dc20a1784b6a14622fedb452b0c44a3fa8fa0944b533f7",
  // https://explorer.nervos.org/aggron/address/ckt1qyqya66tsqkvluh3z7e87tfl507ecq6h6d4qnttnut
  "0x4c155ed678d390cf44648b00ac5245650cdf0be782f197f6190c89facf9e0e2c",
  // https://explorer.nervos.org/aggron/address/ckt1qyqy7mtcum96gyqm67svnlsqavszd8zzq7nskp6aqn
  "0x5522bfdc0706a3cf86235ff2377b70a3bf5fb5141a12653bf541cad07cee8dab",
  // https://explorer.nervos.org/aggron/address/ckt1qyq8yhmuskpy6t7r62jlw5kegg5r7467478s956235
  "0xec081782a395c3e531a7fa75dfb523c11676fb186c1fd29eced10662d933eac2",
  // https://explorer.nervos.org/aggron/address/ckt1qyqtu4az7tkqahms0xp3y9xfgcr5cm4dqdvqdw4wen
  "0xaea2fe668d9c63f7162f1a577efb85d36fa4f0a03ee54376e69bcfea439cc091",
  // https://explorer.nervos.org/aggron/address/ckt1qyq8vlwc9j0f9ssvl5ltmwargua5fkek7exs5rv26s
  "0xca070be231abcb1ca699f8cf57805e3dcbf5c7ee3431ec5709178bc8114c9a0d",
  // https://explorer.nervos.org/aggron/address/ckt1qyqfmcaqwnfwu7gtg7f6tacsgz55pnu9m2wsynj7eg
  "0x09d061f9106e7c85639d64c60701f1eadf90bc8c95d81eb541b8b82903cbd12b",
  // https://explorer.nervos.org/aggron/address/ckt1qyqrzmha00kzux9j4pnkamgjc59equttj2equ5dmnr
  "0xc2355510a1f1563af809306f581656c5c52f2efbb74a71b07f8af5b764a52c2b",
  // https://explorer.nervos.org/aggron/address/ckt1qyqzn4vptujgkjk4wnh4q47sy86znwr8wddspam0ns
  "0xe6e187622a966a9c06b0d9ca659a0a50076fb2f128cc8d32e85ba6781c2ac079",
  // https://explorer.nervos.org/aggron/address/ckt1qyqxfguvfund3uv8pycrf48s957c6k690kfq2pwsv6
  "0x8f75249e8e991ce3907b55d8e33cc09bf267a99276d63375e52b116eb9d75f42",
  // https://explorer.nervos.org/aggron/address/ckt1qyqv348u2d60q0suyyjnxxynwh8u903ay5esx6q6vh
  "0xf99e60349a4caf59539ff57e98906ff27614ce58455b6ca27f2e80d52c2eef3c",
  // https://explorer.nervos.org/aggron/address/ckt1qyq0snw5yrl8m0pu0kczphm7832qf8de82uq76ghtp
  "0x7e1407b99a3767c4344a5960816ee8a2e2c2cf2a9f96d0fe5f60bf3688dae34a",
  // https://explorer.nervos.org/aggron/address/ckt1qyq9fpal4z7p98zgtr3gdq4ct6pg7t5x8p8qcnh0z7
  "0x4bcd6d5909d96de8d77017eda11c81023bac69ee3812c3f07e8902da381928e3",
  // https://explorer.nervos.org/aggron/address/ckt1qyqq7y6xxllf2ykdk3zxa8x789s7zcyvnk7shunhx7
  "0xacb64ec2404f237e6b2848fd5051e3c48108cbe7c9fcd26bc18e71544982d2c3",
  // https://explorer.nervos.org/aggron/address/ckt1qyqw386mv8u30jgk84e3clzrd4adc3rx9rhshu4fqy
  "0xb0b8caf06ffa2f8fb3290d7ea3814ce75298a270f4993ed9670028e131e58eb9",
  // https://explorer.nervos.org/aggron/address/ckt1qyq2e77c7cyfm30cwlkve0t5uyyg20tvcpksxetl35
  "0x7438c5b075ebf5d73824b9c4a0876fb96c8971127a14e2e11e87889e0d83a466",
  // https://explorer.nervos.org/aggron/address/ckt1qyqz6m9kws278r4627zmdc2e7kxsp9n2mrqqz8g4wg
  "0x5d6f6a610593f6ffa91b5cbda28be8a903aa17a0ca8404bed3929218813159cd",
  // https://explorer.nervos.org/aggron/address/ckt1qyqpe9fyq96w7fv9fnddd3kddhy5d73nwztswkkzkt
  "0x3f999b236e9a106d2887a372de0bac611676213aeda00fa4c554b830d7e48a84",
  // https://explorer.nervos.org/aggron/address/ckt1qyq23k3khhuvly9t56mmjzpetv52xmnk802qgyxcd4
  "0x6bc7246e0926b8077440935479438e1396b42265f22c1c0cf615338b5daeafae",
  // https://explorer.nervos.org/aggron/address/ckt1qyqv0l5flawhtcptgalfr8cycmse9y93sd9sdr4p8e
  "0xf4e810e3a840a7680a30cffa299ebc2d3082ed2af2f2c9a1ff8b6da906dd175c",
  // https://explorer.nervos.org/aggron/address/ckt1qyqr446hqufkd8hg2q3tf2d02ysgngcxtyssyk34vr
  "0x5e90724aca248199113c7446e003ecbff98fa03fa5b22bff21eedaeb8d6025e8",
  // https://explorer.nervos.org/aggron/address/ckt1qyqqrzlguxpufv7aqas475nagddz4g4ssd9sfqv6np
  "0x264c9b15803585d9c68b2f51493dcb3874effce5f2c1654cfe0e9c8f586a3b8f",
  // https://explorer.nervos.org/aggron/address/ckt1qyqdc0na9djatcscqelljst380eg8j0ac0mqetj4se
  "0xbbcad1a3c83acec25bcbb34c4cd35af22e4b255c3ba3a353c71cea94e945ec9f",
  // https://explorer.nervos.org/aggron/address/ckt1qyqq39f2z3xahv9dralek4e56hc39phk5qcqzdtf8q
  "0x06d8b77c843e1eb8854b264e9a7363172b45fb7f3a6f3cedf7221324bd498dd0",
  // https://explorer.nervos.org/aggron/address/ckt1qyqzmjqgtz8evetgwm2x08m97tfdzevqr7yq2kg8lc
  "0xa220795c108d2cc4ba6cbed1682587934b49bbd05dd6b98d4c1c90e864598465",
  // https://explorer.nervos.org/aggron/address/ckt1qyqrfp2ls263hahfstwhhnsfesgk40fujy5q3my6eq
  "0xcab0fdf5a69164382c5a97165ea45316e3e342b7101f38b5c826d5d98c50e2e0",
  // https://explorer.nervos.org/aggron/address/ckt1qyqqpjy84x00mkkqhavtv60d586faazt3zkskaqqqv
  "0x3efc4d4a1f8ed7096920752536092220be4e24303cfc4150bec7ec5c245be334",
  // https://explorer.nervos.org/aggron/address/ckt1qyqvycqsqh0vwu6aty6yts8jmqv85pvaag5q5ycv9z
  "0x45a1924a5a77e963ea0403eda4e13c67954fb57c8f15d3966955c05f8892e8ba",
  // https://explorer.nervos.org/aggron/address/ckt1qyqym5f0akc5utadu4f3w9f6a7ml3hlw3gjqhyucxk
  "0x7af8c2ca3a7ad4e86c9f3016f78389db46d75ad184a29a6ec9b3e55429d47158",
  // https://explorer.nervos.org/aggron/address/ckt1qyqpe3fdman84p66eu3vxgq098pnpa4e89ps2rnmz6
  "0xa466da95535c6ffe1dd43fa81a3dd4953be521e4d2807579095320554a7a545b",
  // https://explorer.nervos.org/aggron/address/ckt1qyq04n5eudx3ukjmmd72t679clcapqfa78hqf6mdxy
  "0x8f6798e1c85c8f865fdcb003fdc06942b7226f9a678b873e79040257f34b3395",
  // https://explorer.nervos.org/aggron/address/ckt1qyqrq3g87qc6cmcg5t5j6nyqdxqkmynzdx6s6dc04n
  "0x60ccfcd76242eff2fc76c1ffd8a15359c669f5cb657a3f6e1ae67fa282c22fd0",
  // https://explorer.nervos.org/aggron/address/ckt1qyqxey34vup5jm3s3uhgtmjkxsvhsjsyq62snc3djt
  "0xf6a11632eced9b8d469b919cddd1eb583d6661e926bb4c0056a4eb6d3050defb",
  // https://explorer.nervos.org/aggron/address/ckt1qyqf5wzxq2mr5n3d99qtqx4yctv9pwnwtwtsyr57wx
  "0xd5c7e655bbfe3249ea0564f989c661272a4504941da050ebf3a0e62af7ab4787",
];

/**
 * args[0]: format-account?
 */
(function initAccounts() {
  console.log(`There are ${privKeys.length} accounts in pool.`);

  const args = process.argv.slice(2);
  if (args[0] == "format-account") {
    initConfig();

    console.log(`\t Formatting accounts[${args[1]}..${args[2]}]`);

    privKeys.slice(Number(args[1]), Number(args[2]) || undefined).forEach(privKey => {
      if (!privKey.startsWith("0x")) {
        privKey = "0x" + privKey;
      }
      const ckbAddress = privateKeyToCkbAddress(privKey);
      console.log(`// https://explorer.nervos.org/aggron/address/${ckbAddress}`);
      console.log(`"${privKey}",`);
    });
  }
})();
