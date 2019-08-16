package com.indevstudio.cpnide.server.model;

import java.util.List;

public class NetInfo {
    List<String> enableTrans;
    List<PlaceMark> tokensAndMark;

    public List<String> getEnableTrans() {
        return enableTrans;
    }

    public void setEnableTrans(List<String> enableTrans) {
        this.enableTrans = enableTrans;
    }

    public List<PlaceMark> getTokensAndMark() {
        return tokensAndMark;
    }

    public void setTokensAndMark(List<PlaceMark> tokensAndMark) {
        this.tokensAndMark = tokensAndMark;
    }

    public NetInfo(List<String> enableTrans, List<PlaceMark> tokensAndMark) {
        this.enableTrans = enableTrans;
        this.tokensAndMark = tokensAndMark;
    }
}