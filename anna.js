//"use strict";
// anna.js: Anna Assembler and Simulator

// Copyright (C) 2016-2022  Eric Larson and SC Lee
// Program is currently maintained by Eric Larson at Seattle University
// Email: elarson@seattleu.edu
 
// This program is part of the ANNA Assembler / Simulator Tool Suite
 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// A copy of the license is available at http://www.gnu.org/licenses 
 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// Global Definitions

// Opcode Table
var asmTable = [
    {op: "add",  opCode:0,  funcCode:0, operands:3, asmFn: "asm_r"}, 
    {op: "sub",  opCode:0,  funcCode:1, operands:3, asmFn: "asm_r"}, 
    {op: "and",  opCode:0,  funcCode:2, operands:3, asmFn: "asm_r"}, 
    {op: "or",   opCode:0,  funcCode:3, operands:3, asmFn: "asm_r"}, 
    {op: "not",  opCode:0,  funcCode:4, operands:2, asmFn: "asm_r"}, 
    {op: "jalr", opCode:1, funcCode:0, operands:2, asmFn: "asm_r"}, 
    {op: "in",   opCode:2, funcCode:0, operands:1, asmFn: "asm_r"}, 
    {op: "out",  opCode:3, funcCode:0, operands:1, asmFn: "asm_r"},
    {op: "addi", opCode:4, funcCode:0, operands:3, asmFn: "asm_i6"}, 
    {op: "shf",  opCode:5,  funcCode:0, operands:3, asmFn: "asm_i6"}, 
    {op: "lw",   opCode:6,  funcCode:0, operands:3, asmFn: "asm_i6"}, 
    {op: "sw",   opCode:7,  funcCode:0, operands:3, asmFn: "asm_i6"}, 
    {op: "lli",  opCode:8,  funcCode:0, operands:2, asmFn: "asm_i8l"}, 
    {op: "lui",  opCode:9,  funcCode:0, operands:2, asmFn: "asm_i8l"}, 
    {op: "beq",  opCode:10, funcCode:0, operands:2, asmFn: "asm_i8b"}, 
    {op: "bne",  opCode:11, funcCode:0, operands:2, asmFn: "asm_i8b"},
    {op: "bgt",  opCode:12, funcCode:0, operands:2, asmFn: "asm_i8b"},
    {op: "bge",  opCode:13, funcCode:0, operands:2, asmFn: "asm_i8b"},
    {op: "blt",  opCode:14, funcCode:0, operands:2, asmFn: "asm_i8b"},
    {op: "ble",  opCode:15, funcCode:0, operands:2, asmFn: "asm_i8b"},
    {op: ".halt", opCode:3, funcCode:0, operands:0, asmFn: "asm_halt"},
    {op: ".fill", opCode:0, funcCode:0, operands:1, asmFn: "asm_fill"}  
];

var execTable = [
    "ex_alu",       // 0 alu (add, sub, and, or, not) 
    "ex_jalr",      // 1 jalr
    "ex_in",        // 2 in
    "ex_out",       // 3 out
    "ex_shf_addi",  // 4 addi
    "ex_shf_addi",  // 5 shf
    "ex_mem",       // 6 lw
    "ex_mem",       // 7 sw
    "ex_li",        // 8 lli
    "ex_li",        // 9 lui
    "ex_branch",    // 10 beq
    "ex_branch",    // 11 bne
    "ex_branch",    // 12 bgt
    "ex_branch",    // 13 bge
    "ex_branch",    // 14 blt
    "ex_branch",    // 15 ble
];

const HALT = 0x3000;    // halt instruction
const IN_OPCODE = 2;    // opcode for IN instruction

// 16-bit word that displays in form "0x0018 (24)"
var Word16 = (function() {
    function Word16(v) {
        this.bits = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; // 0:LSB 15:MSB
        if (typeof v === "number") this.setNum(v, true, 16);
        if (typeof v === "object") this.copy(v);
    }
    Word16.prototype.clear = function() {
        for (var i = 0; i < 16; i++)
            this.bits[i] = 0;
    };
    Word16.prototype.isZero = function() {
        for (var i = 0; i < 16; i++)
            if (this.bits[i] != 0) return false;
        return true;
    };
    Word16.prototype.twosCom = function() {
        for (var i = 0; i < 16; i++)
            this.bits[i] = (this.bits[i] == 0) ? 1 : 0; 
        this.inc();
    };
    Word16.prototype.copy = function(v) {
        for (var i = 0; i < 16; i++)
            this.bits[i] = v.bits[i];
    };
    Word16.add = function(a, b) {
        var carry = 0;
        var ret = new Word16();
        for (var i = 0; i < 16; i++) {
            var sum = carry + a.bits[i] + b.bits[i];
            if (sum >= 2) {
                ret.bits[i] = sum - 2;
                carry = 1;
            }
            else {
                ret.bits[i] = sum;
                carry = 0;
            }
        }
        return ret;
    };
    Word16.sub = function(a, b) {
        var b2 = new Word16(b);
        b2.twosCom();
        return this.add(a, b2);
    };
    Word16.land = function(a, b) {
        var ret = new Word16();
        for (var i = 0; i < 16; i++) {
            ret.bits[i] = a.bits[i] & b.bits[i];
        }
        return ret;
    };
    Word16.lor = function(a, b) {
        var ret = new Word16();
        for (var i = 0; i < 16; i++) 
            ret.bits[i] = a.bits[i] | b.bits[i];
        return ret;
    };
    Word16.lnot = function(a) {
        var ret = new Word16();
        for (var i = 0; i < 16; i++)
            ret.bits[i] = (a.bits[i] == 0) ? 1 : 0;
        return ret;
    };
    Word16.shf = function(a, disp) {
        var ret = new Word16();
        for (var i = 0; i < 16; i++) {
            if (0 <= i - disp && i - disp < 16)
                ret.bits[i] = a.bits[i - disp];
        }
        return ret;
    };
    Word16.prototype.setNum = function(v, signed, eff) {
        this.clear();
        if (eff === undefined) eff = 16;
        if (signed) {
            var limit = (1 << (eff-1)) - 1;
            var minus = false;
            var v2;
            if (v < -(limit + 1)) v = -(limit + 1);
            if (v > limit) v = limit;
            v2 = v;
            if (v < 0) {
                minus = true;
                v2 = -v;
            }
            for (var i = 0; i < eff; i++) {
                this.bits[i] = v2 % 2;
                v2 >>= 1;
            }
            if (minus) {
                this.twosCom();
            }
        }
        else {
            var limit = (1 << eff) - 1;
            var v2;
            if (v < 0) v = 0;
            if (v > limit) v = limit;
            v2 = v;
            for (var i = 0; i < eff; i++) {
                this.bits[i] = v2 % 2;
                v2 >>= 1;
            }
        }
    };
    Word16.prototype.setImm = function(s, eff) {
        // HEX
        if (/^0x[0-9a-f]{1,4}$/i.test(s)) {
            var limit_u = (1 << eff) - 1;
            var v = parseInt(s, 16);
            if (v < 0 || v > limit_u)
                return false;
            this.setNum(v, false, 16);
        }
        else if (/^(-|\+)?\d{1,5}$/.test(s)) { 
            var limit_u = (1 << (eff-1)) - 1;
            var limit_l = -(limit_u + 1);
            var v = parseInt(s);
            if (v < limit_l || v > limit_u)
                return false;
            this.setNum(v, true, eff);
        }
        else
            return false;        
    };
    Word16.prototype.setDetail = function(s) {
        this.clear();
        var regexHex = /\b0x([0-9a-f]{1,4})\b/i;
        var regexDec = /\b((-|\+)?\d{1,5})\b/  
        // try hex first
        if (regexHex.test(s)) {
            var m = s.match(regexHex);
            var rs = "0x" + m[1];
            this.setImm(rs, 16);
            return true;
        }
        // then try dec
        else if (regexDec.test(s)) {
            this.setImm(s, 16);
            return true;
        }
        return false;
    };
    Word16.prototype.setBits = function(h, l, v) {
        if (l > h) return;
        var buff = new Word16();
        var ptr = 0;
        if (typeof v === "number")
            buff.setNum(v, false, 16);
        else
            buff.copy(v);
        for (var i = l; i <= h; i++) {
            this.bits[i] = buff.bits[ptr++];
        }
    };
    Word16.prototype.getNum = function(signed, eff) {
        if (eff === undefined) eff = 16;
        if (signed) {
            var sign = this.bits[eff - 1];
            if (sign == 0) {
                return this.getNum(false, eff);
            }
            else {
                var conv = new Word16(this);
                for (var i = 15; i > eff; i--)
                    conv.bits[i] = 1;
                conv.twosCom();
                return -conv.getNum(false, eff);
            }
        }
        var calc = 0;
        for (var i = eff - 1; i >= 0; i--) {
            calc <<= 1;
            calc += this.bits[i];
        }
        return calc;
    };
    Word16.prototype.getBin = function() {
        var val = this.getNum(false);
        var ret = val.toString(2);
        while (ret.length < 16) ret = "0" + ret;
        return ret;
    };
    Word16.prototype.getHex = function(prefix) {
        var val = this.getNum(false);
        var ret = val.toString(16);
        while (ret.length < 4) ret = "0" + ret;
        if (prefix) ret = "0x" + ret;
        return ret;
    };
    Word16.prototype.getDec = function(signed) {
        var num = this.getNum(signed);
        return num.toString();
    };
    Word16.prototype.getDetail = function() {
        return this.getHex(true) + " (" + this.getDec(true) + ")";
    };
    Word16.prototype.getBits = function(h, l) {
        if (l > h) return;
        var buff = new Word16();
        var ptr = 0;
        for (var i = l; i <= h; i++) {
            buff.bits[ptr++] = this.bits[i]
        }
        return buff.getNum(false);      
    };
    Word16.prototype.getBitsSigned = function(h, l) {
        if (l > h) return;
        var buff = new Word16();
        var ptr = 0;
        for (var i = l; i <= h; i++) {
            buff.bits[ptr++] = this.bits[i];
        }
        return buff.getNum(true, h - l + 1);      
    };
    Word16.prototype.inc = function() {
        var carry = 1;
        for (var i = 0; i < 16; i++) {
            var sum = carry + this.bits[i]
            if (sum >= 2) {
                this.bits[i] = sum - 2;
                carry = 1;
            }
            else {
                this.bits[i] = sum;
                carry = 0;
            }
        }
    };
    return Word16;
})();

// Assembler Data

var srcList = [];       // list of source assembly instructions
var instList = [];      // list of maching instructions

// label table
var Labels = { 
    labels: [],
    length: 0,
    clear: function() {
        this.labels = [];
        this.length = 0;
    },
    addLabel: function(name, addr) {
        this.labels[name] = addr;
        this.length++;
    }
};

// instruction
var Instruction = (function() {
    function Instruction() {
        this.tokens = [];
        this.machCode = new Word16();
        this.srcLine = 0;
        this.instString = "";
        this.label = "";
    }
    return Instruction;
})();

// token
var Token = (function() {
    function Token(s) {
        this.s = s;
    }
    Token.prototype.isReg = function() {
        return /^r([0-7])$/.test(this.s); 
    };
    Token.prototype.getReg = function() {
        if (!this.isReg()) return -1;
        var rNo = this.s.replace(/^r([0-7])$/, "$1");
        return parseInt(rNo);
    };
    Token.prototype.isLabelDef = function() {
        return /^(\w+):$/.test(this.s); 
    };
    Token.prototype.getLabelDef = function() {
        return this.s.replace(/^(\w+):$/, "$1");
    };
    Token.prototype.isLabelRef = function() {
        return /^&(\w+)$/.test(this.s); 
    };
    Token.prototype.getLabelRef = function() {
        return this.s.replace(/^&(\w+)$/, "$1");
    };
    Token.prototype.getOp = function() {
        for (var i = 0; i < asmTable.length; i++) {
            if (asmTable[i].op == this.s)
                return asmTable[i];
        }
        return null;
    };
    Token.prototype.getValue = function () {
        return this.s;
    };
    return Token;
})();

// Simulator Data

const STATUS = {
    NOT_LOADED: "NOT LOADED",
    READY: "READY",
    RUNNING: "RUNNING",
    INPUT: "WAITING FOR INPUT",
    HALTED: "HALTED",
    ERROR: "ERROR"
}
var inStepMode = false;
var runStatus = STATUS.NOT_LOADED;
var instEx = 0;                     // Total instructions executed from reset
const AUTO_STOP_INST_COUNT = 2000;  // To prevent an infinite loop 
const UI_NUM_ADDRESSES = 4;         // Number of memory addresses in simulator 

// register file
var Reg = {
    numOfRegs: 8,
    pc: new Word16(),
    reg: [],
    clear: function() {
        this.pc.clear();
        this.reg = [];
        for (var i = 0; i < this.numOfRegs; i++)
            this.reg.push(new Word16());
    },
    get: function(no) {
        if (no < 0 || no >= this.numOfRegs) {
            alertInternalSimError("Invalid register access to r" + no + ")]");
            return new Word16();  
        }
        return this.reg[no];
    },
    set: function(no, v) {
        if (no < 0 || no >= this.numOfRegs) {
            alertInternalSimError("Invalid register access to r" + no + ")]");
            return;
        }
        if (no != 0)    // Ignore r0
            this.reg[no].copy(v);
    }
};

// memory
// sparse memory structure - doesn't allocate the whole memory block
var Mem = {
    numOfAddresses: 65536,
    mem: [],
    clear: function() {
        this.mem = [];
    },
    get: function(addr) {
        if (addr < 0 || addr >= this.numOfAddresses) {
            alertInternalSimError("Invalid memory access to address: " + addr );
            return new Word16();  
        }
        if (this.mem[addr])
            return this.mem[addr];
        return new Word16();  
    },
    set: function(addr, v) {
        if (addr < 0 || addr >= this.numOfAddresses) {
            alertInternalSimError("Invalid memory access to address: " + addr );
            return;  
        }
        this.mem[addr] = new Word16(v);
    }
};

// Initialization

function initializeANNA() {
    clearAsm();
    resetSim();

    for (var i = 0; i < UI_NUM_ADDRESSES; i++) {
        var addrField = $("#addr-" + i)
        addrField.keypress(updateAddrField);
        // addrField.focus(function() { $(this).select(); });
    }
  
    $("#inputVal").keyup(function(event) {
        event.preventDefault();
        if (event.key == "Enter") {
            sim(inStepMode);
        }
    });

}

$(document).ready(function() {
    initializeANNA();  
});

// Output Window Functions

function clearAsmOutput() {
	$("#asm-output").clear();
}

function appendAsmOutput(text) {
	var output = $("#asm-output");
    if (!text) text = "------------------------------";
	output.append(text + '\n');
	output.scrollTop(output[0].scrollHeight);
    output
}

function clearSimOutput() {
	$("#sim-output").clear();
}

function appendSimOutput(text) {
	var output = $("#sim-output");
    if (!text) text = "------------------------------";
	output.append(text + '\n');
	output.scrollTop(output[0].scrollHeight);
}

function alertAsmError(msg, line) {
    var errMsg = "[Error] " + msg;
    if (line !== undefined) errMsg += " [Line:" + (line + 1) + " | " + srcList[line] + " ]";
    appendAsmOutput(errMsg);
}

function alertSimError(msg) {
    appendSimOutput("[Error] " + msg);
    runStatus = STATUS.ERROR;
}

function alertInternalSimError(msg) {
    appendSimOutput("[Internal Error] " + msg);
    appendSimOutput("Please alert your instructor of the error");
    runStatus = STATUS.ERROR;
}

// Assembly functions

function clickAssembleFile(inputfile) {
    var fileReader = new FileReader();
    fileReader.onload = function() {
        if (assembleFile(fileReader.result)) {
            loadToMemAndUI();
            runStatus = STATUS.READY;
            updateSimValues();
            appendAsmOutput("Program successfully assembled: " + inputfile.name);
        }
        else {
            appendAsmOutput("Error during assembly process for: " + inputfile.name);
        }
    }
    fileReader.readAsText(inputfile);
}

function assembleFile(assembly_code) {
    clearAsm();
    $("#codetable").empty();
    runStatus = STATUS.NOT_LOADED;
    resetSim();
    appendAsmOutput();

    if (!pass1ParseAndLabel(assembly_code))
        return false;
    if (!pass2Assemble())
        return false;
    
    return true;
}

function clearAsm() {
    srcList = [];
    instList = [];
    Labels.clear();
}

function pass1ParseAndLabel(rawSrc) {
    srcList = rawSrc.split(/\r?\n/);
    var locCtr = 0;
	for (var i = 0; i < srcList.length; i++) {
		var tokens = srcList[i].split(/\s/);
        var inst = new Instruction();
        inst.srcLine = i;    
		for (var j = 0; j < tokens.length; j++) {
			var token = tokens[j].trim();
			if (token.length > 0 && token[0] == "#") break;
			if (token.length > 0) {
                inst.tokens.push(new Token(token)); // Generate a token object 
            }
  		}
        
        if (inst.tokens.length > 0) {
            // Label
            if (inst.tokens[0].isLabelDef()) {
                var labelDef = inst.tokens[0].getLabelDef();
                if (Labels.labels[labelDef] === undefined) {
                    Labels.addLabel(labelDef, locCtr);
                    inst.tokens.splice(0, 1);       // Remove Label when done
                    if (inst.tokens.length == 0) {
                        alertAsmError("Label must be on same line as instruction", inst.srcLine);
                        return false;    
                    }
                    inst.label = labelDef;
                }
                else {
                    alertAsmError("Duplicate labels", inst.srcLine);
                    return false;
                }
            }

            // Create Instruction String
            for (var j = 0; j < inst.tokens.length; j++) {
                inst.instString = inst.instString + inst.tokens[j].getValue() + " ";
            }
        }
        if (inst.tokens.length > 0) {
            instList.push(inst);
            locCtr++;
        }
	}

    // Sanity checks
    if (instList.length == 0){
        appendAsmOutput("Assembly file contains no instructions");
        return false;
    }
    return true;
}

function pass2Assemble() {
    var foundHalt = false;
    
    for (var locCtr = 0; locCtr < instList.length; locCtr++) {
        var inst = instList[locCtr];
        if (inst.tokens.length == 0) {
            alertAsmError("Invalid or missing operation", inst.srcLine);
            return false;
        }

        var opt = inst.tokens[0].getOp();
        if (opt == null) {
            alertAsmError("Invalid or missing operation", inst.srcLine);
            return false;
        }
        if (inst.tokens.length - 1 != opt.operands) {
            alertAsmError("Wrong number of operands", inst.srcLine);
            return false;
        }
        inst.machCode.setBits(15, 12, opt.opCode);
        if (opt.opCode == 0)
            inst.machCode.setBits(2, 0, opt.funcCode);
        if (opt.op == ".halt")
            foundHalt = true;
        var asmFn = opt.asmFn;
        if (asmFn) {
            if (!window[asmFn](inst, locCtr)) {
                return false;
            }
        }
        else {
            alertAsmError("Internal Error", inst.srcLine);
            return false;
        }
    }
    if (!foundHalt) {
        appendAsmOutput("WARNING: No .halt directive found - infinite loop likely");
    } 
    return true;
}

function asm_r(inst, locCtr) {
    var bitNo = 11;
    for (var i = 1; i < inst.tokens.length; i++) {
        var r = inst.tokens[i].getReg();
        if (r < 0) {
            alertAsmError("Invalid register [" + inst.tokens[i].s + "]", inst.srcLine);
            return false;
        }
        inst.machCode.setBits(bitNo, bitNo - 2, r);
        bitNo -= 3;
    }
    return true;
}

function asm_i6(inst, locCtr) {
    var bitNo = 11;
    for (var i = 1; i <= 2; i++) {
        var r = inst.tokens[i].getReg();
        if (r < 0) {
            alertAsmError("Invalid register [" + inst.tokens[i].s + "]", inst.srcLine);
            return false;
        }
        inst.machCode.setBits(bitNo, bitNo - 2, r);
        bitNo -= 3;
    }
    var imm6 = new Word16();
    if (imm6.setImm(inst.tokens[3].s, 6) == false) {
        alertAsmError("Invalid Immediate Value", inst.srcLine);
        return false;
    }
    inst.machCode.setBits(5, 0, imm6);
    return true;
}

function asm_i8l(inst, locCtr) {
    var r = inst.tokens[1].getReg();
    if (r < 0) {
        alertAsmError("Invalid register [" + inst.tokens[1].s + "]", inst.srcLine);
        return false;
    }
    inst.machCode.setBits(11, 9, r);
    var imm8 = new Word16();
    if (inst.tokens[2].isLabelRef()) {
        var label = Labels.labels[inst.tokens[2].getLabelRef()];
        if (label === undefined || label < 0 || label >= instList.length ) {
            alertAsmError("Invalid label [" + inst.tokens[2].s + "]", inst.srcLine);
            return false;
        }
        imm8.setNum(label);
        if (inst.tokens[0].s == "lui") {
            var temp = new Word16(imm8);
            imm8 = Word16.shf(temp, -8);     // Shift 8 bits
        }
    }
    else if (/^0x[0-9a-f]{1,4}$/i.test(inst.tokens[2].s)) {
        if (imm8.setImm(inst.tokens[2].s, 8) == false) {
            alertAsmError("Invalid Immediate Value", inst.srcLine);
            return false;
        }
    }
    else { 
        if (imm8.setImm(inst.tokens[2].s, 16) == false) {
            alertAsmError("Invalid Immediate Value", inst.srcLine);
            return false;
        }
        if (inst.tokens[0].s == "lui") {
            var temp = new Word16(imm8);
            imm8 = Word16.shf(temp, -8);     // Shift 8 bits
        }
    }
    inst.machCode.setBits(7, 0, imm8);
    return true;
}

function asm_i8b(inst, locCtr) {
    var r = inst.tokens[1].getReg();
    if (r < 0) {
        alertAsmError("Invalid register [" + inst.tokens[1].s + "]", inst.srcLine);
        return false;
    }
    inst.machCode.setBits(11, 9, r);
    var imm8 = new Word16();
    if (inst.tokens[2].isLabelRef()) {
        var label = Labels.labels[inst.tokens[2].getLabelRef()];
        if (label === undefined || label < 0 || label >= instList.length ) {
            alertAsmError("Invalid label [" + inst.tokens[2].s + "]", inst.srcLine);
            return false;
        }
        var disp = label - locCtr - 1;
        if (disp < -128 || disp > 127) {
            alertAsmError("Invalid label - Tried to jump too far [" + inst.tokens[2].s + "]", inst.srcLine);
            return false;
        }
        imm8.setNum(disp, true, 8);
    }
    else { 
        if (imm8.setImm(inst.tokens[2].s, 8) == false) {
            alertAsmError("Invalid Immediate Value", inst.srcLine);
            return false;
        }
    }
    inst.machCode.setBits(7, 0, imm8);
    return true;
}

function asm_halt(inst, locCtr)
{
    inst.machCode.setBits(15, 0, HALT);
    return true;
}

function asm_fill(inst, locCtr)
{
    if (inst.tokens[1].isLabelRef()) {
        var labelAddr = Labels.labels[inst.tokens[1].getLabelRef()];
        if (labelAddr === undefined || labelAddr < 0 || labelAddr >= instList.length ) {
            alertAsmError("Invalid label [" + inst.tokens[1].s + "]", inst.srcLine);
            return false;
        }
        inst.machCode.setNum(labelAddr, false, 16);
    }
    else {
        if (inst.machCode.setImm(inst.tokens[1].s, 16) == false) {
            alertAsmError("Invalid Immediate Value", inst.srcLine);
            return false;
        }
    }
    return true;
}

function loadToMemAndUI() {
	var ctable = $("#codetable");
    var locCtr;
    for (locCtr = 0; locCtr < instList.length; locCtr++) {
        var inst = instList[locCtr];
        // Load to Mem
        Mem.set(locCtr, inst.machCode);
        // Output to Code Table
        ctable.append("<tr><td style='width:10%'></td>" + 
                      "<td style='width:10%;'><input type='checkbox' id='bp-" + locCtr + "'></td>" + 
                      "<td style='width:20%;'>" + inst.label + "</td>" +
                      "<td style='width:25%;'>" + (new Word16(locCtr)).getDetail() + "</td>" +
                      "<td style='width:35%;'>" + inst.instString + "</td></tr>");
    }
    appendSimOutput();
    appendSimOutput("Program loaded to the memory");
}

// Simulator Functions

function resetSim() {
    Reg.clear();
    Mem.clear();

    if (runStatus != STATUS.NOT_LOADED) {
        for (var locCtr = 0; locCtr < instList.length; locCtr++) {
            var inst = instList[locCtr];
            Mem.set(locCtr, inst.machCode);
        }
        runStatus = STATUS.READY;
        appendSimOutput();
        appendSimOutput("Simulator has been reset");
    }
    
    instEx = 0;
    exitInputMode();
    updateSimValues();
}

function sim(isStep) { 
    var resumeInputInst = false;

    // Check status
    switch (runStatus) {
        case STATUS.NOT_LOADED:
            appendSimOutput("Program has not been assembled or loaded");
            return;
        case STATUS.HALTED:
            appendSimOutput("Program has halted - reset simulator to rerun program");
            return;
        case STATUS.ERROR:
            appendSimOutput("Simulator has halted due to error - reset simulator to rerun program");
            return;
        case STATUS.READY:
            appendSimOutput("Starting execution");
            runStatus = STATUS.RUNNING;
            break;
        case STATUS.INPUT:
            resumeInputInst = true;
            runStatus = STATUS.RUNNING;
            break;
    }

    var suspendFlag = 0;
    while (suspendFlag == 0 && runStatus == STATUS.RUNNING) {
        
        // Fetch and decode
        var inst = Mem.get(Reg.pc.getNum());
        
        // Dec
        var opCode = inst.getBits(15,12);

        if (opCode == IN_OPCODE) {
            var inputDone = false;
            if (resumeInputInst) {
                if (complete_in(inst)) {
                    inputDone = true;
                }
                resumeInputInst = false;
            }
            else {
                appendSimOutput("Program paused for input.  Please enter a value.");
            }
            if (inputDone) {
                Reg.pc.inc();
                instEx++;
                exitInputMode();
            }
            else {
                runStatus = STATUS.INPUT;
                inStepMode = isStep;
                enterInputMode();
            }
        }
        else {
            Reg.pc.inc();
        
            // Execute
            var exFn = execTable[opCode];
            if (exFn) {
                window[exFn](inst);
            }
            else {
                alertInternalSimError("Unable to decode instruction at PC: " + Reg.pc.getDetail());
            }
            instEx++;
        }
        updateSimValues();
        
        if (isStep) {
            suspendFlag = 1;
        }
        if (checkBP()) {
            suspendFlag = 1;
            appendSimOutput("Stopped at breakpoint - PC: " + Reg.pc.getDetail());
        }
        if (instEx % AUTO_STOP_INST_COUNT == 0 && runStatus == STATUS.RUNNING) {
            suspendFlag = 1;
            appendSimOutput("ANNA simulator stops every " + AUTO_STOP_INST_COUNT + " instructions. ");
            appendSimOutput("Your program may be in an infinite loop or jumped to a point outside the program.");
            appendSimOutput("If it is a normal execution, you may resume by pressing the [Run/Continue] button."); 
        }
    }

    if (runStatus == STATUS.HALTED) {
    	appendSimOutput("Halted successfully! (" + instEx + " instructions executed!)");
    }
    else if (runStatus == STATUS.ERROR) {
    	appendSimOutput("Halted by an error! (" + instEx + " instructions executed!)");
    }
}

function confirmInput() {
    sim(inStepMode);
}

function enterInputMode() {
    document.getElementById("inputVal").removeAttribute("readonly");
    $("#inputVal").val("");
    document.getElementById("runButton").disabled = true;
    document.getElementById("stepButton").disabled = true;
}

function exitInputMode() {
    $("#inputVal").val("");
    document.getElementById("inputVal").setAttribute("readonly", "");
    document.getElementById("runButton").disabled = false;
    document.getElementById("stepButton").disabled = false;
} 

function checkBP() {
    var bpSel = "#bp-" + Reg.pc.getNum();
    var bpChBox = $(bpSel);
    if (bpChBox) {
        if (bpChBox.prop("checked") == true)
            return true;
    }
    return false;
}

function updateSimValues() {
    // Regs
    for (var i = 0; i < Reg.numOfRegs; i++) {
        $("#reg-r" + i).val(Reg.reg[i].getDetail());
    }
    $("#reg-pc").val(Reg.pc.getDetail());

    // Mems
    for (var i = 0; i < UI_NUM_ADDRESSES; i++) {
        var addrItem = $("#addr-" + i);
        var addrStr = addrItem.val();
        var addr = new Word16();
        addr.setDetail(addrStr);
        addrItem.val(addr.getDetail());
        if (addrItem.val() != addrStr) addrItem.select();   // select if changed!
        var mem = Mem.get(addr.getNum());
        $("#mem-" + i).val(mem.getDetail());
    }
    
    // PC
    upateSimPC();
    
    // Simulator status
    $("#simStatus").val(runStatus);
    
    // # of InstEx
    $("#instEx").val(instEx);
}

// Update PC in code table
function upateSimPC() {
    var cTable = $("#codetable");
    var current = false;
    for (var i = 0; i < instList.length; i++) {
        var childNo = i + 1;
        var tr = cTable.find("tr:nth-child(" + childNo + ")");
        var td = tr.find("td:nth-child(1)");
        current = i == Reg.pc.getNum();         
        td.text(current ? "PC>" : "");
        tr.css("background-color", current ? "aquamarine" : "white");
    }
    cTable.scrollTop(Reg.pc.getNum());
}

function updateAddrField(event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode != '13') return;
    var tid = event.target.id;
    var item = $("#" + tid);
    var itemVal = new Word16();
    itemVal.setDetail(item.val());
    item.val(itemVal.getDetail());
    updateSimValues();
    item.select();
}

function clearBreakpoints() {
    for (var locCtr = 0; locCtr < instList.length; locCtr++) {
        var bpSel = "#bp-" + locCtr;
        var bpChBox = $(bpSel);
        if (bpChBox) {
            bpChBox.prop("checked", false);
        }
    }
    appendSimOutput("All breakpoints cleared!");
}

// Instruction Execution Functions

function ex_alu(inst) {
    var Rd = inst.getBits(11, 9);
    var Rs1 = inst.getBits(8, 6);
    var Rs2 = inst.getBits(5, 3);
    switch (inst.getBits(2,0)) {
    case 0: Reg.set(Rd, Word16.add(Reg.get(Rs1), Reg.get(Rs2))); break;
    case 1: Reg.set(Rd, Word16.sub(Reg.get(Rs1), Reg.get(Rs2))); break;
    case 2: Reg.set(Rd, Word16.land(Reg.get(Rs1), Reg.get(Rs2))); break;
    case 3: Reg.set(Rd, Word16.lor(Reg.get(Rs1), Reg.get(Rs2))); break;
    case 4: Reg.set(Rd, Word16.lnot(Reg.get(Rs1))); break;
    }
}

function ex_shf_addi(inst) {
    var opCode = inst.getBits(15,12); 
    var Rd = inst.getBits(11, 9);
    var Rs1 = inst.getBits(8, 6);
    var val = inst.getBitsSigned(5, 0);
    if (opCode == 4) {          // addi
        var buff = new Word16();
        buff.setNum(val, true);
        Reg.set(Rd, Word16.add(Reg.get(Rs1), buff));
    }
    else if (opCode == 5) {     // shf
        Reg.set(Rd, Word16.shf(Reg.get(Rs1), val));
    }

}

function ex_li(inst) {
    var opCode = inst.getBits(15,12); 
    var Rd = inst.getBits(11, 9);
    var r = Reg.get(Rd);
    var val = inst.getBits(7, 0);
    if (opCode == 8) {          // lli
        r.setBits(7, 0, val);
        // Zero extension
        var signBit = r.bits[7]; 
        for (var i = 8; i < 16; i++) {
            r.setBits(i, i, signBit);
        }
    }
    else if (opCode == 9) {     // lui
        r.setBits(15, 8, val);
    }
}

function ex_mem(inst) {
    var opCode = inst.getBits(15,12); 
    var Rd = inst.getBits(11, 9);
    var Rs1 = inst.getBits(8, 6);
    var val = inst.getBitsSigned(5, 0);
    var memAddr = Reg.get(Rs1).getNum();
    memAddr += val;
    if (memAddr < 0) memAddr += 65536;
    if (memAddr >= 65536) memAddr -= 65536;
    if (opCode == 6) {          // lw
        Reg.set(Rd, Mem.get(memAddr));        
    }   
    else if (opCode == 7) {     // sw
        Mem.set(memAddr, Reg.get(Rd));
    } 
}

function ex_branch(inst) {
    var cond = false;
    var Rd = inst.getBits(11, 9);
    var check = Reg.get(Rd).getNum(true);
    var val = inst.getBitsSigned(7, 0);
    switch (inst.getBits(15,12)) {
        case 10: if (check == 0) cond = true; break;
        case 11: if (check != 0) cond = true; break;
        case 12: if (check > 0) cond = true; break;
        case 13: if (check >= 0) cond = true; break;
        case 14: if (check < 0) cond = true; break;
        case 15: if (check <= 0) cond = true; break;
    }
    if (cond) {
        var buff = new Word16();
        buff.setNum(Reg.pc.getNum() + val);
        Reg.pc.copy(buff);
    }   
}

function ex_jalr(inst) {
    var Rd = inst.getBits(11, 9);
    var Rs1 = inst.getBits(8, 6);
    var buffSrc = new Word16(Reg.pc.getNum());
    var buffTar = new Word16(Reg.get(Rd));
    Reg.set(Rs1, buffSrc);
    Reg.pc.copy(buffTar);
}

function ex_in(inst) {
    alertInternalSimError("Unexpected improper execution of in instruction");
/*  var Rd = inst.getBits(11, 9);
    var msg = "Please input a value for [r" + Rd + "]?";
    var inputDone = false;
    while (!inputDone) {
        var inValue = prompt(msg, "0");
        if (inValue == null) {
            alertSimError("Input instruction cancelled");
            inputDone = true;
        }
        else {
            var inValueWord = new Word16();
            if (inValueWord.setDetail(inValue)) {
                Reg.set(Rd, inValueWord);
                appendSimOutput("Input value [r" + Rd + "] : " + Reg.get(Rd).getDetail());
                inputDone = true;
            }
            else {
                msg = "Invalid input value.  Try again.";
            }
        }
    } */
}

function complete_in(inst) {
    var Rd = inst.getBits(11, 9);
    var inValue = $("#inputVal").val()
    var inValueWord = new Word16();
    if (inValueWord.setDetail(inValue)) {
        Reg.set(Rd, inValueWord);
        appendSimOutput("Input value [r" + Rd + "] : " + Reg.get(Rd).getDetail());
        return true;
    }
    appendSimOutput("Invalid input value.  Try again.");
    return false;
}

function ex_out(inst) {
    var Rd = inst.getBits(11, 9);
    if (Rd == 0) {
        runStatus = STATUS.HALTED;
        return;
    }
    appendSimOutput("Output value [r" + Rd + "] : " + Reg.get(Rd).getDetail());
}


